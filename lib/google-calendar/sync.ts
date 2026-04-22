import "server-only";

import type { calendar_v3 } from "googleapis";

import { createGoogleCalendarClient, hasGoogleCalendarConfig } from "@/lib/google-calendar/client";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import type { ProjectStatus } from "@/types/projects";

type MilestoneType = "setup" | "event" | "teardown";

type ProjectSyncRow = {
  id: string;
  status: ProjectStatus;
  location_address: string | null;
  setup_starts_at: string | null;
  event_starts_at: string | null;
  event_ends_at: string | null;
  teardown_at: string | null;
  clients: { name: string } | null;
};

type MilestoneInput = {
  type: MilestoneType;
  startIso: string;
  endIso: string;
  titleSuffix: string;
};

const DEFAULT_SLOT_MINUTES = 120;

function plusMinutesIso(startIso: string, minutes: number): string {
  const start = new Date(startIso);
  return new Date(start.getTime() + minutes * 60 * 1000).toISOString();
}

function toMilestones(row: ProjectSyncRow): MilestoneInput[] {
  const list: MilestoneInput[] = [];

  if (row.setup_starts_at) {
    list.push({
      type: "setup",
      startIso: row.setup_starts_at,
      endIso: plusMinutesIso(row.setup_starts_at, DEFAULT_SLOT_MINUTES),
      titleSuffix: "הקמה",
    });
  }

  if (row.event_starts_at) {
    list.push({
      type: "event",
      startIso: row.event_starts_at,
      endIso: row.event_ends_at ?? plusMinutesIso(row.event_starts_at, DEFAULT_SLOT_MINUTES),
      titleSuffix: "אירוע",
    });
  }

  if (row.teardown_at) {
    list.push({
      type: "teardown",
      startIso: row.teardown_at,
      endIso: plusMinutesIso(row.teardown_at, DEFAULT_SLOT_MINUTES),
      titleSuffix: "פירוק",
    });
  }

  return list;
}

function buildGoogleEventBody(
  row: ProjectSyncRow,
  milestone: MilestoneInput,
): calendar_v3.Schema$Event {
  const client = row.clients?.name?.trim() || "ללא לקוח";
  const location = row.location_address?.trim() || "";
  const summary = `${client} - ${milestone.titleSuffix}`;
  const descriptionLines = [
    `מזהה פרויקט: ${row.id}`,
    `לקוח: ${client}`,
    location ? `כתובת: ${location}` : "",
    `מקור: מערכת ברגע הראשון`,
  ].filter(Boolean);

  return {
    summary,
    location: location || undefined,
    description: descriptionLines.join("\n"),
    start: { dateTime: milestone.startIso },
    end: { dateTime: milestone.endIso },
  };
}

async function fetchProjectForSync(projectId: string): Promise<ProjectSyncRow | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      id,
      status,
      location_address,
      setup_starts_at,
      event_starts_at,
      event_ends_at,
      teardown_at,
      clients ( name )
    `,
    )
    .eq("id", projectId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("fetchProjectForSync failed", error);
    }
    return null;
  }

  return data as unknown as ProjectSyncRow;
}

async function loadMapping(projectId: string): Promise<Map<MilestoneType, string>> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("project_google_events")
    .select("milestone_type, google_event_id")
    .eq("project_id", projectId);

  if (error) {
    console.error("loadMapping failed", error);
    return new Map();
  }

  const map = new Map<MilestoneType, string>();
  for (const row of data ?? []) {
    const milestone = row.milestone_type as MilestoneType;
    const eventId = row.google_event_id as string;
    if (milestone && eventId) {
      map.set(milestone, eventId);
    }
  }
  return map;
}

async function removeMapping(projectId: string, milestone: MilestoneType): Promise<void> {
  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase
    .from("project_google_events")
    .delete()
    .eq("project_id", projectId)
    .eq("milestone_type", milestone);
  if (error) {
    console.error("removeMapping failed", error);
  }
}

async function upsertMapping(projectId: string, milestone: MilestoneType, eventId: string): Promise<void> {
  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase.from("project_google_events").upsert(
    {
      project_id: projectId,
      milestone_type: milestone,
      google_event_id: eventId,
    },
    { onConflict: "project_id,milestone_type" },
  );
  if (error) {
    console.error("upsertMapping failed", error);
  }
}

async function deleteGoogleEvent(calendarId: string, eventId: string): Promise<void> {
  const client = createGoogleCalendarClient();
  if (!client) {
    return;
  }
  try {
    await client.calendar.events.delete({ calendarId, eventId });
  } catch (error) {
    console.error("deleteGoogleEvent failed", error);
  }
}

function shouldDeleteAllByStatus(status: ProjectStatus): boolean {
  return status === "closed";
}

export async function syncProjectMilestonesToGoogle(projectId: string): Promise<void> {
  if (!hasGoogleCalendarConfig()) {
    return;
  }

  const project = await fetchProjectForSync(projectId);
  if (!project) {
    return;
  }

  const google = createGoogleCalendarClient();
  if (!google) {
    return;
  }

  const existing = await loadMapping(projectId);
  const milestones = shouldDeleteAllByStatus(project.status) ? [] : toMilestones(project);
  const milestoneByType = new Map<MilestoneType, MilestoneInput>();
  for (const m of milestones) {
    milestoneByType.set(m.type, m);
  }

  for (const [type, eventId] of existing.entries()) {
    if (!milestoneByType.has(type)) {
      await deleteGoogleEvent(google.calendarId, eventId);
      await removeMapping(projectId, type);
    }
  }

  for (const milestone of milestones) {
    const eventBody = buildGoogleEventBody(project, milestone);
    const existingEventId = existing.get(milestone.type);

    if (existingEventId) {
      try {
        const updated = await google.calendar.events.update({
          calendarId: google.calendarId,
          eventId: existingEventId,
          requestBody: eventBody,
        });
        if (updated.data.id) {
          await upsertMapping(projectId, milestone.type, updated.data.id);
        }
        continue;
      } catch (error) {
        console.error("google event update failed; will recreate", error);
      }
    }

    try {
      const created = await google.calendar.events.insert({
        calendarId: google.calendarId,
        requestBody: eventBody,
      });
      if (created.data.id) {
        await upsertMapping(projectId, milestone.type, created.data.id);
      }
    } catch (error) {
      console.error("google event insert failed", error);
    }
  }
}

export async function backfillAllProjectsToGoogle(): Promise<{ total: number }> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase.from("projects").select("id").order("created_at", { ascending: true });
  if (error) {
    throw error;
  }

  let total = 0;
  for (const row of data ?? []) {
    const id = row.id as string;
    if (!id) {
      continue;
    }
    await syncProjectMilestonesToGoogle(id);
    total += 1;
  }

  return { total };
}
