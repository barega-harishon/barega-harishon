"use server";

import { z } from "zod";

import { getCurrentUserEmployeeId } from "@/lib/auth/current-employee";
import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import type { TimeEntryProjectOption, TimeEntryRow } from "@/types/time-entries";
import { sanitizeText } from "@/utils/sanitize";

const createSchema = z.object({
  projectId: z.string().uuid(),
  /** למשרד/תפעול — עובד שעליו מדווחים; בשטח לא נשלח */
  employeeId: z.string().uuid().optional(),
  workDate: z.string().min(8, "נא לבחור תאריך"),
  hours: z.coerce.number().min(0.25, "מינימום רבע שעה").max(24, "מקסימום 24 שעות"),
  note: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v ? sanitizeText(v) : "")),
});

function toHoursNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function listTimeEntriesForProject(projectId: string): Promise<TimeEntryRow[]> {
  const parsed = z.string().uuid().safeParse(projectId);
  if (!parsed.success) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("time_entries")
    .select(
      `
      id,
      employee_id,
      project_id,
      work_date,
      hours,
      note,
      created_at,
      employees ( name )
    `,
    )
    .eq("project_id", parsed.data)
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as unknown as TimeEntryRow[]).map((row) => ({
    ...row,
    hours: toHoursNumber(row.hours),
  }));
}

export async function listMyRecentTimeEntries(limit = 30): Promise<TimeEntryRow[]> {
  const employeeId = await getCurrentUserEmployeeId();
  if (!employeeId) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("time_entries")
    .select(
      `
      id,
      employee_id,
      project_id,
      work_date,
      hours,
      note,
      created_at,
      employees ( name ),
      projects ( location_address, clients ( name ) )
    `,
    )
    .eq("employee_id", employeeId)
    .order("work_date", { ascending: false })
    .limit(Math.min(100, Math.max(1, limit)));

  if (error || !data) {
    return [];
  }

  return (data as unknown as TimeEntryRow[]).map((row) => ({
    ...row,
    hours: toHoursNumber(row.hours),
  }));
}

/** פרויקטים משובצים לטופס דיווח (שטח). */
export async function listTimeEntryProjectOptionsForMe(): Promise<TimeEntryProjectOption[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data: emp } = await supabase
    .from("employees")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!emp) {
    return [];
  }

  const employeeId = emp.id as string;
  const { data: rows, error } = await supabase
    .from("assignments")
    .select(
      `
      project_id,
      projects (
        id,
        location_address,
        clients ( name )
      )
    `,
    )
    .eq("employee_id", employeeId);

  if (error || !rows?.length) {
    return [];
  }

  const map = new Map<string, TimeEntryProjectOption>();
  for (const row of rows) {
    const p = row.projects as unknown;
    if (!p || typeof p !== "object" || Array.isArray(p)) {
      continue;
    }
    const proj = p as {
      id?: string;
      location_address?: string | null;
      clients?: { name?: string } | null;
    };
    const id = proj.id;
    if (!id || map.has(id)) {
      continue;
    }
    const client = proj.clients?.name ?? "לקוח";
    const addr = proj.location_address?.trim() || "ללא כתובת";
    map.set(id, { id, label: `${client} · ${addr}` });
  }

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "he"));
}

export async function createTimeEntry(payload: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "נתוני דיווח לא תקינים." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "נדרשת התחברות." };
    }

    let employeeId: string | null = null;
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const role = profile?.role as string | undefined;

    if (role === "field") {
      employeeId = await getCurrentUserEmployeeId();
      if (!employeeId) {
        return {
          success: false,
          message: "לא נמצאה רשומת עובד משויכת למשתמש. פנו למשרד.",
        };
      }
    } else if (role === "admin" || role === "office" || role === "operations") {
      const staffEmp = parsed.data.employeeId;
      if (!staffEmp) {
        return { success: false, message: "נא לבחור עובד." };
      }
      employeeId = staffEmp;
    } else {
      return { success: false, message: "אין הרשאה לדיווח שעות." };
    }

    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        employee_id: employeeId,
        project_id: parsed.data.projectId,
        work_date: parsed.data.workDate,
        hours: parsed.data.hours,
        note: parsed.data.note || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("createTimeEntry", error);
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "דיווח השעות נשמר.",
      data: { id: data.id as string },
    };
  } catch (error) {
    console.error("createTimeEntry failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function createTimeEntryFromForm(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }> | null> {
  const employeeRaw = formData.get("employeeId");
  return createTimeEntry({
    projectId: formData.get("projectId"),
    employeeId:
      typeof employeeRaw === "string" && employeeRaw.length > 0 ? employeeRaw : undefined,
    workDate: formData.get("workDate"),
    hours: formData.get("hours"),
    note: formData.get("note"),
  });
}
