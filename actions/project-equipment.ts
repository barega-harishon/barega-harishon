"use server";

import { z } from "zod";

import {
  reservationWindowFromProjectDates,
  reservationWindowsOverlap,
  utcCalendarDayWindowMs,
  type ReservationWindowMs,
} from "@/lib/equipment/reservation-window";
import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import type {
  EquipmentAvailability,
  EquipmentOption,
  ProjectEquipmentLine,
} from "@/types/project-equipment";

function readProjectDateFields(projects: unknown): {
  status: string;
  setup_starts_at: string | null;
  event_starts_at: string | null;
  event_ends_at: string | null;
  teardown_at: string | null;
} | null {
  if (!projects || typeof projects !== "object") {
    return null;
  }
  const p = Array.isArray(projects) ? projects[0] : projects;
  if (!p || typeof p !== "object") {
    return null;
  }
  const o = p as Record<string, unknown>;
  return {
    status: String(o.status ?? ""),
    setup_starts_at: typeof o.setup_starts_at === "string" ? o.setup_starts_at : null,
    event_starts_at: typeof o.event_starts_at === "string" ? o.event_starts_at : null,
    event_ends_at: typeof o.event_ends_at === "string" ? o.event_ends_at : null,
    teardown_at: typeof o.teardown_at === "string" ? o.teardown_at : null,
  };
}

function lineCountsForAllocation(
  refWindow: ReservationWindowMs | null,
  lineProject: ReturnType<typeof readProjectDateFields>,
): boolean {
  if (!lineProject || lineProject.status === "closed") {
    return false;
  }
  const lineWindow = reservationWindowFromProjectDates(lineProject);
  if (refWindow === null) {
    return true;
  }
  if (lineWindow === null) {
    return true;
  }
  return reservationWindowsOverlap(refWindow, lineWindow);
}

export async function listEquipmentOptions(): Promise<EquipmentOption[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("id, name, category, total_qty")
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as EquipmentOption[];
}

export async function getEquipmentAvailabilityMap(
  referenceDate?: Date,
): Promise<Record<string, EquipmentAvailability>> {
  const supabase = await createServerSupabaseClient();

  const [{ data: equipment }, { data: lines }, { data: warehousePicks }] = await Promise.all([
    supabase.from("equipment").select("id, total_qty"),
    supabase
      .from("project_equipment")
      .select(
        "id, equipment_id, quantity, projects!inner(status, setup_starts_at, event_starts_at, event_ends_at, teardown_at)",
      ),
    supabase
      .from("equipment_pick_transactions")
      .select("equipment_id, quantity, tx_type, adjustment_direction")
      .eq("source", "warehouse"),
  ]);

  const allocated: Record<string, number> = {};
  const dashboardWindow = utcCalendarDayWindowMs(referenceDate ?? new Date());

  for (const line of lines ?? []) {
    const row = line as {
      equipment_id: string;
      quantity: number;
      projects: unknown;
    };
    const proj = readProjectDateFields(row.projects);
    if (!lineCountsForAllocation(dashboardWindow, proj)) {
      continue;
    }

    const equipmentId = row.equipment_id;
    allocated[equipmentId] = (allocated[equipmentId] ?? 0) + Number(row.quantity);
  }

  const map: Record<string, EquipmentAvailability> = {};
  const warehousePickedByEquipment: Record<string, number> = {};
  for (const row of warehousePicks ?? []) {
    const id = row.equipment_id as string;
    const qty = Number(row.quantity);
    if (Number.isNaN(qty)) {
      continue;
    }
    const txType = ((row as { tx_type?: string }).tx_type ?? "pick") as
      | "pick"
      | "return"
      | "adjustment";
    const adjustmentDirection = (row as { adjustment_direction?: string }).adjustment_direction;
    const signed =
      txType === "return"
        ? qty
        : txType === "adjustment"
          ? adjustmentDirection === "in"
            ? qty
            : -qty
          : -qty;
    warehousePickedByEquipment[id] = (warehousePickedByEquipment[id] ?? 0) + signed;
  }

  for (const item of equipment ?? []) {
    const id = item.id as string;
    const totalQty = Math.max(0, Number(item.total_qty) + (warehousePickedByEquipment[id] ?? 0));
    const used = allocated[id] ?? 0;
    map[id] = {
      totalQty,
      allocated: used,
      available: Math.max(0, totalQty - used),
    };
  }

  return map;
}

export async function listProjectEquipmentLines(
  projectId: string,
): Promise<ProjectEquipmentLine[]> {
  const parsed = z.string().uuid().safeParse(projectId);
  if (!parsed.success) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("project_equipment")
    .select(
      `
      id,
      quantity,
      picked_qty,
      equipment_id,
      equipment:equipment_id ( id, name, category, total_qty )
    `,
    )
    .eq("project_id", parsed.data)
    .order("id", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as unknown as ProjectEquipmentLine[];
}

async function allocatedExceptLine(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  equipmentId: string,
  contextProjectId: string,
  excludeLineId?: string,
): Promise<number> {
  const { data: ctxRow } = await supabase
    .from("projects")
    .select("status, setup_starts_at, event_starts_at, event_ends_at, teardown_at")
    .eq("id", contextProjectId)
    .maybeSingle();

  const ctx = ctxRow as {
    status?: string;
    setup_starts_at?: string | null;
    event_starts_at?: string | null;
    event_ends_at?: string | null;
    teardown_at?: string | null;
  } | null;

  const refWindow =
    ctx && String(ctx.status) !== "closed"
      ? reservationWindowFromProjectDates({
          setup_starts_at: ctx.setup_starts_at ?? null,
          event_starts_at: ctx.event_starts_at ?? null,
          event_ends_at: ctx.event_ends_at ?? null,
          teardown_at: ctx.teardown_at ?? null,
        })
      : null;

  const { data } = await supabase
    .from("project_equipment")
    .select(
      "id, quantity, projects!inner(status, setup_starts_at, event_starts_at, event_ends_at, teardown_at)",
    )
    .eq("equipment_id", equipmentId);

  let sum = 0;

  for (const line of data ?? []) {
    const row = line as {
      id: string;
      quantity: number;
      projects: unknown;
    };

    if (excludeLineId && row.id === excludeLineId) {
      continue;
    }

    const proj = readProjectDateFields(row.projects);
    if (!lineCountsForAllocation(refWindow, proj)) {
      continue;
    }

    sum += Number(row.quantity);
  }

  return sum;
}

const upsertLineSchema = z.object({
  projectId: z.string().uuid(),
  equipmentId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1, "כמות חייבת להיות לפחות 1").max(50000),
});

export async function upsertProjectEquipmentLine(
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = upsertLineSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "נתוני ציוד לא תקינים." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "נדרשת התחברות." };
    }

    const { data: projRow, error: projLoadErr } = await supabase
      .from("projects")
      .select("status")
      .eq("id", parsed.data.projectId)
      .maybeSingle();

    if (projLoadErr || !projRow) {
      return { success: false, message: "הפרויקט לא נמצא." };
    }
    if (String(projRow.status) === "closed") {
      return { success: false, message: "לא ניתן לעדכן ציוד בפרויקט סגור." };
    }

    const { data: equip, error: equipError } = await supabase
      .from("equipment")
      .select("total_qty")
      .eq("id", parsed.data.equipmentId)
      .maybeSingle();

    if (equipError || !equip) {
      return { success: false, message: "פריט הציוד לא נמצא." };
    }

    const totalQty = Number(equip.total_qty);

    const { data: existing } = await supabase
      .from("project_equipment")
      .select("id")
      .eq("project_id", parsed.data.projectId)
      .eq("equipment_id", parsed.data.equipmentId)
      .maybeSingle();

    const excludeId = existing?.id as string | undefined;
    const others = await allocatedExceptLine(
      supabase,
      parsed.data.equipmentId,
      parsed.data.projectId,
      excludeId,
    );

    if (others + parsed.data.quantity > totalQty) {
      return {
        success: false,
        message: "אין מספיק כמות זמינה בפריט זה לפי המלאי והשיבוצים הפעילים.",
      };
    }

    const { data, error } = await supabase
      .from("project_equipment")
      .upsert(
        {
          project_id: parsed.data.projectId,
          equipment_id: parsed.data.equipmentId,
          quantity: parsed.data.quantity,
        },
        { onConflict: "project_id,equipment_id" },
      )
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "שורת הציוד נשמרה.",
      data: { id: data.id as string },
    };
  } catch (error) {
    console.error("upsertProjectEquipmentLine failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function upsertProjectEquipmentLineFromForm(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }> | null> {
  return upsertProjectEquipmentLine({
    projectId: formData.get("projectId"),
    equipmentId: formData.get("equipmentId"),
    quantity: formData.get("quantity"),
  });
}

const removeLineSchema = z.object({
  lineId: z.string().uuid(),
});

export async function removeProjectEquipmentLine(
  payload: unknown,
): Promise<ActionResult<Record<string, never>>> {
  const parsed = removeLineSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("project_equipment")
      .delete()
      .eq("id", parsed.data.lineId);

    if (error) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return { success: true, message: "שורת הציוד הוסרה." };
  } catch (error) {
    console.error("removeProjectEquipmentLine failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}
