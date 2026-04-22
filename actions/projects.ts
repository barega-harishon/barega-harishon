"use server";

import { z } from "zod";

import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { syncProjectMilestonesToGoogle } from "@/lib/google-calendar/sync";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasAnyAppRole, isOfficeOrAdminRole } from "@/types/app-role";
import type { ActionResult } from "@/types/common";
import type { CalendarProjectRow } from "@/types/calendar";
import type { AppRole } from "@/types/app-role";
import type { ProjectDetailRow, ProjectListRow, ProjectStatus } from "@/types/projects";
import { sanitizeText } from "@/utils/sanitize";

const projectStatusSchema = z.enum([
  "incoming",
  "quote",
  "approved",
  "prep",
  "setup",
  "teardown",
  "closed",
]);

const createProjectSchema = z.object({
  clientId: z.string().uuid("נא לבחור לקוח תקין"),
  locationAddress: z
    .string()
    .max(500, "כתובת ארוכה מדי")
    .optional()
    .transform((v) => (v ? sanitizeText(v) : "")),
  setupStartsAt: z.string().optional(),
  eventStartsAt: z.string().optional(),
  eventEndsAt: z.string().optional(),
  teardownAt: z.string().optional(),
});

const updateStatusSchema = z.object({
  projectId: z.string().uuid(),
  status: projectStatusSchema,
});

function toIsoOrNull(value: string | undefined): string | null {
  if (!value || value.trim() === "") {
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toISOString();
}

/** בלי embed ל־clients — מונע כשלי PostgREST/RLS על join; שמות נטענים בנפרד. */
const PROJECT_LIST_SELECT = `
      id,
      client_id,
      status,
      location_address,
      total_price,
      setup_starts_at,
      event_starts_at,
      event_ends_at,
      teardown_at,
      created_at
    `;

async function attachClientNamesToProjectRows(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  rows: Omit<ProjectListRow, "clients">[],
): Promise<ProjectListRow[]> {
  if (rows.length === 0) {
    return [];
  }
  const ids = [...new Set(rows.map((r) => r.client_id).filter((id): id is string => typeof id === "string"))];
  if (ids.length === 0) {
    return rows.map((r) => ({ ...r, clients: null }));
  }

  const { data: clientRows, error } = await supabase.from("clients").select("id, name").in("id", ids);
  if (error) {
    console.error("attachClientNamesToProjectRows failed", error);
    return rows.map((r) => ({ ...r, clients: null }));
  }

  const nameById = new Map<string, string>();
  for (const c of clientRows ?? []) {
    const id = c.id as string;
    const name = typeof c.name === "string" ? c.name : "";
    nameById.set(id, name);
  }

  return rows.map((r) => ({
    ...r,
    status: r.status as ProjectListRow["status"],
    clients: nameById.has(r.client_id) ? { name: nameById.get(r.client_id)! } : null,
  }));
}

function normalizeProjectSearchTerm(raw: string | undefined): string {
  if (!raw) {
    return "";
  }
  return raw.trim().replace(/[%_,]/g, "").slice(0, 80);
}

function baseProjectsListQuery(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  filter?: { status?: ProjectStatus; clientId?: string },
) {
  let q = supabase.from("projects").select(PROJECT_LIST_SELECT);
  if (filter?.status) {
    q = q.eq("status", filter.status);
  }
  if (filter?.clientId) {
    q = q.eq("client_id", filter.clientId);
  }
  return q;
}

export async function listProjects(
  filter?: { status?: ProjectStatus; clientId?: string; search?: string },
): Promise<ProjectListRow[]> {
  const supabase = await createServerSupabaseClient();
  const roles = await getCurrentAppRoles();
  const canSeeIncoming = isOfficeOrAdminRole(roles);
  if (filter?.status === "incoming" && !canSeeIncoming) {
    return [];
  }
  const term = normalizeProjectSearchTerm(filter?.search);

  if (term.length >= 2) {
    const pattern = `%${term}%`;

    if (filter?.clientId) {
      const { data, error } = await baseProjectsListQuery(supabase, filter)
        .ilike("location_address", pattern)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("listProjects search (client+location) failed", error);
        return [];
      }
      if (!data) {
        return [];
      }
      return attachClientNamesToProjectRows(supabase, data as unknown as Omit<ProjectListRow, "clients">[]);
    }

    const { data: clientMatches } = await supabase
      .from("clients")
      .select("id")
      .ilike("name", pattern);

    const idList = (clientMatches ?? []).map((r) => r.id as string);

    const promises = [
      baseProjectsListQuery(supabase, filter).ilike("location_address", pattern).order("created_at", {
        ascending: false,
      }),
    ];

    if (idList.length > 0) {
      promises.push(
        baseProjectsListQuery(supabase, filter).in("client_id", idList).order("created_at", {
          ascending: false,
        }),
      );
    }

    const results = await Promise.all(promises);
    const map = new Map<string, Omit<ProjectListRow, "clients">>();

    for (const res of results) {
      if (res.error) {
        console.error("listProjects search subquery failed", res.error);
      }
      const rows = res.data ?? [];
      for (const row of rows) {
        const p = row as unknown as Omit<ProjectListRow, "clients">;
        map.set(p.id, p);
      }
    }

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return attachClientNamesToProjectRows(supabase, merged);
  }

  const { data, error } = await baseProjectsListQuery(supabase, filter).order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("listProjects failed", error);
    return [];
  }
  if (!data) {
    return [];
  }

  return attachClientNamesToProjectRows(supabase, data as unknown as Omit<ProjectListRow, "clients">[]);
}

export async function getProjectById(id: string): Promise<ProjectDetailRow | null> {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      id,
      client_id,
      status,
      location_address,
      total_price,
      public_tracking_token,
      setup_starts_at,
      event_starts_at,
      event_ends_at,
      teardown_at,
      created_at,
      clients ( name ),
      project_site_details (
        access_notes,
        cladding_color,
        carpet_cladding_color,
        fabric_cladding_color,
        notes,
        site_photo_paths,
        sketch_path,
        submitted_by_client,
        updated_at
      )
    `,
    )
    .eq("id", parsedId.data)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as unknown as ProjectDetailRow & {
    project_site_details: unknown;
  };

  if (Array.isArray(row.project_site_details)) {
    row.project_site_details =
      (row.project_site_details[0] as ProjectDetailRow["project_site_details"]) ??
      null;
  }

  return row as ProjectDetailRow;
}

export async function createProject(
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createProjectSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: "יש שדות לא תקינים בפרטי הפרויקט.",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "נדרשת התחברות." };
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        client_id: parsed.data.clientId,
        status: "quote",
        location_address: parsed.data.locationAddress || null,
        total_price: 0,
        setup_starts_at: toIsoOrNull(parsed.data.setupStartsAt),
        event_starts_at: toIsoOrNull(parsed.data.eventStartsAt),
        event_ends_at: toIsoOrNull(parsed.data.eventEndsAt),
        teardown_at: toIsoOrNull(parsed.data.teardownAt),
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    await syncProjectMilestonesToGoogle(data.id as string);

    return {
      success: true,
      message: "הפרויקט נוצר בהצלחה.",
      data: { id: data.id as string },
    };
  } catch (error) {
    console.error("createProject failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function createProjectFromForm(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }> | null> {
  return createProject({
    clientId: formData.get("clientId"),
    locationAddress: formData.get("locationAddress"),
    setupStartsAt: formData.get("setupStartsAt"),
    eventStartsAt: formData.get("eventStartsAt"),
    eventEndsAt: formData.get("eventEndsAt"),
    teardownAt: formData.get("teardownAt"),
  });
}

function canEditProjectCoreDetails(roles: AppRole[]): boolean {
  return hasAnyAppRole(roles, ["admin", "office", "operations"]);
}

const updateProjectCoreSchema = z
  .object({
    projectId: z.string().uuid(),
    locationAddress: z
      .string()
      .max(500, "כתובת ארוכה מדי")
      .transform((v) => sanitizeText(v.trim())),
    setupStartsAt: z.string().optional(),
    eventStartsAt: z.string().optional(),
    eventEndsAt: z.string().optional(),
    teardownAt: z.string().optional(),
  })
  .refine((d) => d.locationAddress.length >= 3, { message: "נא למלא כתובת אירוע." })
  .refine((d) => Boolean(d.eventStartsAt?.trim()), { message: "נא לבחור תאריך תחילת אירוע." })
  .refine(
    (d) => {
      const setup = toIsoOrNull(d.setupStartsAt);
      const start = toIsoOrNull(d.eventStartsAt);
      if (!setup || !start) {
        return true;
      }
      return new Date(setup).getTime() <= new Date(start).getTime();
    },
    { message: "תאריך הקמה חייב להיות לפני או באותו זמן כמו תחילת האירוע." },
  )
  .refine(
    (d) => {
      const start = toIsoOrNull(d.eventStartsAt);
      const end = toIsoOrNull(d.eventEndsAt);
      if (!start || !end) {
        return true;
      }
      return new Date(start).getTime() <= new Date(end).getTime();
    },
    { message: "תחילת האירוע חייבת להיות לפני או בזמן סיום האירוע." },
  )
  .refine(
    (d) => {
      const end = toIsoOrNull(d.eventEndsAt);
      const tear = toIsoOrNull(d.teardownAt);
      if (!end || !tear) {
        return true;
      }
      return new Date(end).getTime() <= new Date(tear).getTime();
    },
    { message: "סיום האירוע חייב להיות לפני או בזמן הפירוק." },
  )
  .refine(
    (d) => {
      const start = toIsoOrNull(d.eventStartsAt);
      const tear = toIsoOrNull(d.teardownAt);
      if (!start || !tear) {
        return true;
      }
      return new Date(start).getTime() <= new Date(tear).getTime();
    },
    { message: "תחילת האירוע חייבת להיות לפני או בזמן הפירוק." },
  );

export async function updateProjectCore(
  payload: unknown,
): Promise<ActionResult<Record<string, never>>> {
  const parsed = updateProjectCoreSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, message: first?.message ?? "יש שגיאות בפרטי הפרויקט." };
  }

  try {
    const roles = await getCurrentAppRoles();
    if (!canEditProjectCoreDetails(roles)) {
      return { success: false, message: "אין הרשאה לעדכן פרטי פרויקט." };
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "נדרשת התחברות." };
    }

    const { error } = await supabase
      .from("projects")
      .update({
        location_address: parsed.data.locationAddress,
        setup_starts_at: toIsoOrNull(parsed.data.setupStartsAt),
        event_starts_at: toIsoOrNull(parsed.data.eventStartsAt),
        event_ends_at: toIsoOrNull(parsed.data.eventEndsAt),
        teardown_at: toIsoOrNull(parsed.data.teardownAt),
      })
      .eq("id", parsed.data.projectId);

    if (error) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    await syncProjectMilestonesToGoogle(parsed.data.projectId);

    return { success: true, message: "פרטי הפרויקט עודכנו." };
  } catch (error) {
    console.error("updateProjectCore failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function updateProjectCoreFromForm(
  _prev: ActionResult<Record<string, never>> | null,
  formData: FormData,
): Promise<ActionResult<Record<string, never>> | null> {
  return updateProjectCore({
    projectId: formData.get("projectId"),
    locationAddress: formData.get("locationAddress"),
    setupStartsAt: formData.get("setupStartsAt"),
    eventStartsAt: formData.get("eventStartsAt"),
    eventEndsAt: formData.get("eventEndsAt"),
    teardownAt: formData.get("teardownAt"),
  });
}

export async function updateProjectStatusFromForm(
  _prev: ActionResult<{ status: ProjectStatus }> | null,
  formData: FormData,
): Promise<ActionResult<{ status: ProjectStatus }> | null> {
  return updateProjectStatus({
    projectId: formData.get("projectId"),
    status: formData.get("status"),
  });
}

const updateTotalPriceSchema = z.object({
  projectId: z.string().uuid(),
  totalPrice: z.coerce.number().min(0, "סכום לא יכול להיות שלילי"),
});

export async function updateProjectTotalPrice(
  payload: unknown,
): Promise<ActionResult<{ total_price: number }>> {
  const parsed = updateTotalPriceSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "סכום לא תקין." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("projects")
      .update({ total_price: parsed.data.totalPrice })
      .eq("id", parsed.data.projectId);

    if (error) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "סכום ההצעה עודכן.",
      data: { total_price: parsed.data.totalPrice },
    };
  } catch (error) {
    console.error("updateProjectTotalPrice failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function updateProjectTotalPriceFromForm(
  _prev: ActionResult<{ total_price: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ total_price: number }> | null> {
  return updateProjectTotalPrice({
    projectId: formData.get("projectId"),
    totalPrice: formData.get("totalPrice"),
  });
}

export async function updateProjectStatus(
  payload: unknown,
): Promise<ActionResult<{ status: ProjectStatus }>> {
  const parsed = updateStatusSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }

  try {
    const roles = await getCurrentAppRoles();
    if (parsed.data.status === "incoming" && !isOfficeOrAdminRole(roles)) {
      return { success: false, message: "אין הרשאה להעביר לסטטוס בקשה נכנסת." };
    }
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("projects")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.projectId);

    if (error) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    await syncProjectMilestonesToGoogle(parsed.data.projectId);

    return {
      success: true,
      message: "סטטוס הפרויקט עודכן.",
      data: { status: parsed.data.status },
    };
  } catch (error) {
    console.error("updateProjectStatus failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function approveIncomingProjectRequest(
  payload: unknown,
): Promise<ActionResult<{ status: ProjectStatus }>> {
  const parsed = z.object({ projectId: z.string().uuid() }).safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }

  try {
    const roles = await getCurrentAppRoles();
    if (!isOfficeOrAdminRole(roles)) {
      return { success: false, message: "אין הרשאה לאשר בקשות נכנסות." };
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("projects")
      .update({ status: "quote" })
      .eq("id", parsed.data.projectId)
      .eq("status", "incoming")
      .select("status")
      .maybeSingle();

    if (error) {
      return { success: false, message: getSafeClientErrorMessage() };
    }
    if (!data) {
      return { success: false, message: "הבקשה כבר טופלה או שאינה במצב בקשה נכנסת." };
    }

    await syncProjectMilestonesToGoogle(parsed.data.projectId);

    return {
      success: true,
      message: "הבקשה אושרה והועברה להצעה.",
      data: { status: "quote" },
    };
  } catch (error) {
    console.error("approveIncomingProjectRequest failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function approveIncomingProjectRequestFromForm(
  _prev: ActionResult<{ status: ProjectStatus }> | null,
  formData: FormData,
): Promise<ActionResult<{ status: ProjectStatus }> | null> {
  return approveIncomingProjectRequest({
    projectId: formData.get("projectId"),
  });
}

function parseProjectStatusForCalendar(s: string): ProjectStatus {
  const r = projectStatusSchema.safeParse(s);
  return r.success ? r.data : "quote";
}

function readClientNameFromRow(clients: unknown): { name: string } | null {
  if (!clients || typeof clients !== "object" || Array.isArray(clients)) {
    return null;
  }
  const name = (clients as { name?: string }).name;
  return typeof name === "string" ? { name } : null;
}

export interface CalendarMonthQueryOptions {
  /** סינון סטטוסים; ריק = כל הסטטוסים */
  statusFilter?: ProjectStatus[];
  /** הגבלה לרשימת מזהי פרויקט (למשל שיבוצים של עובד שטח). `[]` מחזיר רשימה ריקה */
  restrictToProjectIds?: string[];
}

/** פרויקטים בחודש: עיגון לפי אירוע → הקמה → פירוק (לכל פרויקט יום אחד בלבד). */
export async function listProjectsForCalendarMonth(
  year: number,
  month: number,
  options: CalendarMonthQueryOptions = {},
): Promise<CalendarProjectRow[]> {
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return [];
  }

  if (options.restrictToProjectIds?.length === 0) {
    return [];
  }

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const supabase = await createServerSupabaseClient();

  const select = `
    id,
    status,
    event_starts_at,
    setup_starts_at,
    teardown_at,
    location_address,
    clients ( name )
  `;

  const baseEvent = supabase
    .from("projects")
    .select(select)
    .not("event_starts_at", "is", null)
    .gte("event_starts_at", startIso)
    .lt("event_starts_at", endIso)
    .order("event_starts_at", { ascending: true });

  const baseSetup = supabase
    .from("projects")
    .select(select)
    .is("event_starts_at", null)
    .not("setup_starts_at", "is", null)
    .gte("setup_starts_at", startIso)
    .lt("setup_starts_at", endIso)
    .order("setup_starts_at", { ascending: true });

  const baseTeardown = supabase
    .from("projects")
    .select(select)
    .is("event_starts_at", null)
    .is("setup_starts_at", null)
    .not("teardown_at", "is", null)
    .gte("teardown_at", startIso)
    .lt("teardown_at", endIso)
    .order("teardown_at", { ascending: true });

  type CalendarQueryLike<T> = {
    in: (column: string, values: string[]) => T;
    neq: (column: string, value: string) => T;
  };

  const applyOpts = <T extends CalendarQueryLike<T>>(q: T): T => {
    let out = q;
    const ids = options.restrictToProjectIds;
    if (ids !== undefined && ids.length > 0) {
      out = out.in("id", ids);
    }
    const st = options.statusFilter;
    if (st && st.length > 0) {
      out = out.in("status", st);
    }
    return out;
  };

  const [{ data: byEvent, error: e1 }, { data: bySetup, error: e2 }, { data: byTeardown, error: e3 }] =
    await Promise.all([
      applyOpts(baseEvent),
      applyOpts(baseSetup),
      applyOpts(baseTeardown),
    ]);

  if (e1 || e2 || e3) {
    return [];
  }

  const map = new Map<string, CalendarProjectRow>();

  for (const row of byEvent ?? []) {
    const id = row.id as string;
    const est = row.event_starts_at as string;
    map.set(id, {
      id,
      status: parseProjectStatusForCalendar(String(row.status)),
      anchorIso: est,
      dateSource: "event",
      location_address: (row.location_address as string | null) ?? null,
      clients: readClientNameFromRow(row.clients),
    });
  }

  for (const row of bySetup ?? []) {
    const id = row.id as string;
    if (map.has(id)) {
      continue;
    }
    const sst = row.setup_starts_at as string;
    map.set(id, {
      id,
      status: parseProjectStatusForCalendar(String(row.status)),
      anchorIso: sst,
      dateSource: "setup",
      location_address: (row.location_address as string | null) ?? null,
      clients: readClientNameFromRow(row.clients),
    });
  }

  for (const row of byTeardown ?? []) {
    const id = row.id as string;
    if (map.has(id)) {
      continue;
    }
    const td = row.teardown_at as string;
    map.set(id, {
      id,
      status: parseProjectStatusForCalendar(String(row.status)),
      anchorIso: td,
      dateSource: "teardown",
      location_address: (row.location_address as string | null) ?? null,
      clients: readClientNameFromRow(row.clients),
    });
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.anchorIso).getTime() - new Date(b.anchorIso).getTime(),
  );
}

/** יומן מצומצם לפרויקטים שמשתמש מסוג שטח משובץ אליהם */
export async function listMyAssignedProjectsCalendarMonth(
  year: number,
  month: number,
  options: Omit<CalendarMonthQueryOptions, "restrictToProjectIds"> = {},
): Promise<CalendarProjectRow[]> {
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
  const { data: assigns, error } = await supabase
    .from("assignments")
    .select("project_id")
    .eq("employee_id", employeeId);

  if (error || !assigns?.length) {
    return [];
  }

  const ids = [...new Set(assigns.map((a) => a.project_id as string))];
  return listProjectsForCalendarMonth(year, month, {
    ...options,
    restrictToProjectIds: ids,
  });
}

export interface AssignedProjectBrief {
  id: string;
  status: ProjectStatus;
  location_address: string | null;
  clientName: string | null;
}

/** פרויקטים שמשתמש מחובר משובץ אליהם (למסכי שטח). */
export async function listMyAssignedProjectsBrief(): Promise<AssignedProjectBrief[]> {
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
        status,
        location_address,
        clients ( name )
      )
    `,
    )
    .eq("employee_id", employeeId);

  if (error || !rows?.length) {
    return [];
  }

  const byId = new Map<string, AssignedProjectBrief>();
  for (const row of rows) {
    const p = row.projects as unknown;
    if (!p || typeof p !== "object" || Array.isArray(p)) {
      continue;
    }
    const proj = p as {
      id?: string;
      status?: string;
      location_address?: string | null;
      clients?: { name?: string } | null;
    };
    const id = proj.id;
    if (!id || byId.has(id)) {
      continue;
    }
    const clients = proj.clients;
    const clientName =
      clients && typeof clients === "object" && typeof clients.name === "string"
        ? clients.name
        : null;
    byId.set(id, {
      id,
      status: parseProjectStatusForCalendar(String(proj.status ?? "quote")),
      location_address:
        typeof proj.location_address === "string" ? proj.location_address : null,
      clientName,
    });
  }

  return Array.from(byId.values()).sort((a, b) =>
    (a.clientName ?? "").localeCompare(b.clientName ?? "", "he"),
  );
}
