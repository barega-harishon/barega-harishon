"use server";

import { z } from "zod";

import { listTrucks } from "@/actions/trucks";
import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import type { ProjectTruckLine, TruckOptionForProject } from "@/types/project-trucks";

function readProjectStatus(projects: unknown): string | undefined {
  if (!projects || typeof projects !== "object") {
    return undefined;
  }
  if (Array.isArray(projects)) {
    const first = projects[0];
    if (first && typeof first === "object" && "status" in first) {
      return String((first as { status: string }).status);
    }
    return undefined;
  }
  if ("status" in projects) {
    return String((projects as { status: string }).status);
  }
  return undefined;
}

export async function listProjectTruckLines(projectId: string): Promise<ProjectTruckLine[]> {
  const parsed = z.string().uuid().safeParse(projectId);
  if (!parsed.success) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("project_trucks")
    .select(
      `
      project_id,
      truck_id,
      created_at,
      truck:truck_id (
        id,
        license_plate,
        status,
        driver_id,
        driver:driver_id ( id, name )
      )
    `,
    )
    .eq("project_id", parsed.data)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as unknown as ProjectTruckLine[];
}

/** משאיות לבחירה: כבר בפרויקט — לא מוצגות; משובצות לפרויקט פעיל אחר — חסומות עם סיבה */
export async function listTruckOptionsForProject(projectId: string): Promise<TruckOptionForProject[]> {
  const parsed = z.string().uuid().safeParse(projectId);
  if (!parsed.success) {
    return [];
  }

  const pid = parsed.data;
  const trucks = await listTrucks();
  if (trucks.length === 0) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const truckIds = trucks.map((t) => t.id);

  const { data: links } = await supabase
    .from("project_trucks")
    .select("truck_id, project_id, projects!inner(status)")
    .in("truck_id", truckIds);

  const onThisProject = new Set<string>();
  const blocked = new Map<string, string>();

  for (const row of links ?? []) {
    const r = row as {
      truck_id: string;
      project_id: string;
      projects: unknown;
    };
    const status = readProjectStatus(r.projects);
    if (r.project_id === pid) {
      onThisProject.add(r.truck_id);
      continue;
    }
    if (status === "closed") {
      continue;
    }
    if (!blocked.has(r.truck_id)) {
      blocked.set(
        r.truck_id,
        "משובצת כבר לפרויקט פעיל אחר. הסר שם לפני שיבוץ כאן.",
      );
    }
  }

  return trucks
    .filter((t) => !onThisProject.has(t.id))
    .map((t) => ({
      id: t.id,
      license_plate: t.license_plate,
      blockedReason: blocked.get(t.id) ?? null,
    }));
}

async function truckBlockedOnOtherActiveProject(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  truckId: string,
  exceptProjectId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("project_trucks")
    .select("project_id, projects!inner(status)")
    .eq("truck_id", truckId);

  for (const row of data ?? []) {
    const r = row as { project_id: string; projects: unknown };
    if (r.project_id === exceptProjectId) {
      continue;
    }
    if (readProjectStatus(r.projects) === "closed") {
      continue;
    }
    return true;
  }
  return false;
}

const addSchema = z.object({
  projectId: z.string().uuid(),
  truckId: z.string().uuid(),
});

export async function addProjectTruck(payload: unknown): Promise<ActionResult<Record<string, never>>> {
  const parsed = addSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "נדרשת התחברות." };
    }

    const busy = await truckBlockedOnOtherActiveProject(
      supabase,
      parsed.data.truckId,
      parsed.data.projectId,
    );
    if (busy) {
      return {
        success: false,
        message: "המשאית משובצת כבר לפרויקט פעיל אחר.",
      };
    }

    const { data: proj, error: projErr } = await supabase
      .from("projects")
      .select("status")
      .eq("id", parsed.data.projectId)
      .maybeSingle();

    if (projErr || !proj) {
      return { success: false, message: "הפרויקט לא נמצא." };
    }
    if (String(proj.status) === "closed") {
      return { success: false, message: "לא ניתן לשבץ משאית לפרויקט סגור." };
    }

    const { error } = await supabase.from("project_trucks").insert({
      project_id: parsed.data.projectId,
      truck_id: parsed.data.truckId,
    });

    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") {
        return { success: false, message: "המשאית כבר משובצת לפרויקט זה." };
      }
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return { success: true, message: "המשאית שובצה לפרויקט." };
  } catch (error) {
    console.error("addProjectTruck failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function addProjectTruckFromForm(
  _prev: ActionResult<Record<string, never>> | null,
  formData: FormData,
): Promise<ActionResult<Record<string, never>> | null> {
  return addProjectTruck({
    projectId: formData.get("projectId"),
    truckId: formData.get("truckId"),
  });
}

const removeSchema = z.object({
  projectId: z.string().uuid(),
  truckId: z.string().uuid(),
});

export async function removeProjectTruck(payload: unknown): Promise<ActionResult<Record<string, never>>> {
  const parsed = removeSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("project_trucks")
      .delete()
      .eq("project_id", parsed.data.projectId)
      .eq("truck_id", parsed.data.truckId);

    if (error) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return { success: true, message: "שיבוץ המשאית הוסר." };
  } catch (error) {
    console.error("removeProjectTruck failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export type TruckActiveProjectInfo = { projectId: string; label: string };

/** לכל משאית — פרויקט פעיל יחיד (אם יש כמה בשגיאת נתונים, נלקח הראשון) */
export async function mapTruckIdToActiveProject(): Promise<Record<string, TruckActiveProjectInfo>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("project_trucks").select(
    `
    truck_id,
    project_id,
    projects (
      id,
      status,
      clients ( name )
    )
  `,
  );

  if (error || !data) {
    return {};
  }

  const out: Record<string, TruckActiveProjectInfo> = {};

  for (const row of data) {
    const r = row as {
      truck_id: string;
      project_id: string;
      projects: unknown;
    };
    const status = readProjectStatus(r.projects);
    if (status === "closed") {
      continue;
    }
    if (out[r.truck_id]) {
      continue;
    }
    let clientName: string | undefined;
    if (r.projects && typeof r.projects === "object" && !Array.isArray(r.projects)) {
      const clients = (r.projects as { clients?: { name?: string } | { name?: string }[] }).clients;
      if (clients && !Array.isArray(clients) && typeof clients.name === "string") {
        clientName = clients.name;
      } else if (Array.isArray(clients) && clients[0]?.name) {
        clientName = String(clients[0].name);
      }
    }
    out[r.truck_id] = {
      projectId: r.project_id,
      label: clientName?.trim() ? clientName : `פרויקט ${r.project_id.slice(0, 8)}…`,
    };
  }

  return out;
}

export async function getTruckActiveProjectAssignment(
  truckId: string,
): Promise<TruckActiveProjectInfo | null> {
  const parsed = z.string().uuid().safeParse(truckId);
  if (!parsed.success) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("project_trucks")
    .select(
      `
      project_id,
      projects (
        id,
        status,
        clients ( name )
      )
    `,
    )
    .eq("truck_id", parsed.data);

  if (error || !data) {
    return null;
  }

  for (const row of data) {
    const r = row as {
      project_id: string;
      projects: unknown;
    };
    if (readProjectStatus(r.projects) === "closed") {
      continue;
    }
    let clientName: string | undefined;
    if (r.projects && typeof r.projects === "object" && !Array.isArray(r.projects)) {
      const clients = (r.projects as { clients?: { name?: string } | { name?: string }[] }).clients;
      if (clients && !Array.isArray(clients) && typeof clients.name === "string") {
        clientName = clients.name;
      } else if (Array.isArray(clients) && clients[0]?.name) {
        clientName = String(clients[0].name);
      }
    }
    return {
      projectId: r.project_id,
      label: clientName?.trim() ? clientName : `פרויקט ${r.project_id.slice(0, 8)}…`,
    };
  }

  return null;
}
