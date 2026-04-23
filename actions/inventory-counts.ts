"use server";

import { z } from "zod";

import { listEquipmentRows } from "@/actions/equipment-catalog";
import { getEquipmentAvailabilityMap } from "@/actions/project-equipment";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasAnyAppRole, type AppRole } from "@/types/app-role";
import type { ActionResult } from "@/types/common";
import type { InventoryCountLineRow, InventoryCountRow } from "@/types/inventory-counts";

function canManageCounts(roles: AppRole[]): boolean {
  return hasAnyAppRole(roles, ["admin", "office", "warehouse"]);
}

function getDbErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function mapInventoryDbError(error: unknown, fallback = getSafeClientErrorMessage()): string {
  const code = getDbErrorCode(error);
  if (code === "42501") {
    return "אין הרשאה לפעולה זו בספירת מלאי.";
  }
  if (code === "42P01" || code === "42703") {
    return "חסרה מיגרציית ספירת מלאי במסד הנתונים. יש להריץ עדכוני DB.";
  }
  return fallback;
}

const createCountSchema = z.object({
  note: z.string().max(500).optional(),
});

const postCountSchema = z.object({
  countId: z.string().uuid(),
});

const upsertCountLinesSchema = z.object({
  countId: z.string().uuid(),
  lines: z.array(
    z.object({
      equipmentId: z.string().uuid(),
      countedQty: z.coerce.number().int().min(0).max(999_999),
    }),
  ),
});

export async function listInventoryCounts(limit = 20): Promise<InventoryCountRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("inventory_counts")
    .select("id, note, status, created_at, posted_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) {
    if (error) {
      console.error("listInventoryCounts failed", toServerError(error));
    }
    return [];
  }
  return data as InventoryCountRow[];
}

export async function getInventoryCountLines(countId: string): Promise<InventoryCountLineRow[]> {
  const parsed = z.string().uuid().safeParse(countId);
  if (!parsed.success) {
    return [];
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("inventory_count_lines")
    .select(
      "id, count_id, equipment_id, expected_qty, counted_qty, delta_qty, equipment:equipment_id(name, category)",
    )
    .eq("count_id", parsed.data)
    .order("created_at", { ascending: true });
  if (error || !data) {
    if (error) {
      console.error("getInventoryCountLines failed", toServerError(error));
    }
    return [];
  }
  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    count_id: String(row.count_id),
    equipment_id: String(row.equipment_id),
    expected_qty: Number(row.expected_qty ?? 0),
    counted_qty: Number(row.counted_qty ?? 0),
    delta_qty: Number(row.delta_qty ?? 0),
    equipment_name:
      typeof (row.equipment as { name?: unknown } | null)?.name === "string"
        ? ((row.equipment as { name?: string }).name ?? undefined)
        : undefined,
    equipment_category:
      typeof (row.equipment as { category?: unknown } | null)?.category === "string"
        ? ((row.equipment as { category?: string }).category ?? undefined)
        : undefined,
  }));
}

export async function createInventoryCount(payload: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createCountSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "נתוני ספירה לא תקינים." };
  }
  try {
    const roles = await getCurrentAppRoles();
    if (!canManageCounts(roles)) {
      return { success: false, message: "אין הרשאה לפתיחת ספירה." };
    }
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const [equipmentRows, availability] = await Promise.all([
      listEquipmentRows(),
      getEquipmentAvailabilityMap(),
    ]);

    const { data: countRow, error: countErr } = await supabase
      .from("inventory_counts")
      .insert({
        note: parsed.data.note?.trim() || null,
        status: "draft",
        counted_by: user?.id ?? null,
      })
      .select("id")
      .single();
    if (countErr || !countRow) {
      return { success: false, message: mapInventoryDbError(countErr) };
    }

    const lines = equipmentRows.map((row) => ({
      count_id: countRow.id,
      equipment_id: row.id,
      expected_qty: Math.max(0, availability[row.id]?.totalQty ?? row.total_qty),
      counted_qty: Math.max(0, availability[row.id]?.totalQty ?? row.total_qty),
    }));
    if (lines.length > 0) {
      const { error: linesErr } = await supabase.from("inventory_count_lines").insert(lines);
      if (linesErr) {
        await supabase.from("inventory_counts").delete().eq("id", countRow.id);
        return { success: false, message: mapInventoryDbError(linesErr, "פתיחת הספירה נכשלה ביצירת שורות.") };
      }
    }
    return { success: true, message: "ספירת מלאי חדשה נפתחה.", data: { id: String(countRow.id) } };
  } catch (error) {
    console.error("createInventoryCount failed", toServerError(error));
    return { success: false, message: mapInventoryDbError(error) };
  }
}

export async function upsertInventoryCountLines(
  payload: unknown,
): Promise<ActionResult<{ updated: number }>> {
  const parsed = upsertCountLinesSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "נתוני שורות ספירה לא תקינים." };
  }
  try {
    const roles = await getCurrentAppRoles();
    if (!canManageCounts(roles)) {
      return { success: false, message: "אין הרשאה לעדכון ספירה." };
    }
    const supabase = await createServerSupabaseClient();
    const rows = parsed.data.lines.map((line) => ({
      count_id: parsed.data.countId,
      equipment_id: line.equipmentId,
      counted_qty: line.countedQty,
    }));
    const { error } = await supabase
      .from("inventory_count_lines")
      .upsert(rows, { onConflict: "count_id,equipment_id" });
    if (error) {
      return { success: false, message: mapInventoryDbError(error) };
    }
    return { success: true, message: "שורות הספירה נשמרו.", data: { updated: rows.length } };
  } catch (error) {
    console.error("upsertInventoryCountLines failed", toServerError(error));
    return { success: false, message: mapInventoryDbError(error) };
  }
}

export async function postInventoryCount(payload: unknown): Promise<ActionResult<{ adjusted: number }>> {
  const parsed = postCountSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }
  try {
    const roles = await getCurrentAppRoles();
    if (!canManageCounts(roles)) {
      return { success: false, message: "אין הרשאה לאישור ספירה." };
    }
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: countRow } = await supabase
      .from("inventory_counts")
      .select("id, status")
      .eq("id", parsed.data.countId)
      .maybeSingle();
    if (!countRow) {
      return { success: false, message: "ספירה לא נמצאה." };
    }
    if (String(countRow.status) === "posted") {
      return { success: false, message: "הספירה כבר אושרה." };
    }

    const lines = await getInventoryCountLines(parsed.data.countId);
    const nonZero = lines.filter((line) => line.delta_qty !== 0);
    if (nonZero.length === 0) {
      const { error: updErr } = await supabase
        .from("inventory_counts")
        .update({ status: "posted", posted_by: user?.id ?? null, posted_at: new Date().toISOString() })
        .eq("id", parsed.data.countId);
      if (updErr) {
        return { success: false, message: mapInventoryDbError(updErr) };
      }
      return { success: true, message: "הספירה אושרה (ללא פערים).", data: { adjusted: 0 } };
    }

    const rows = nonZero.map((line) => ({
      equipment_id: line.equipment_id,
      project_id: null,
      batch_id: null,
      quantity: Math.abs(line.delta_qty),
      source: "warehouse" as const,
      tx_type: "adjustment" as const,
      adjustment_direction: line.delta_qty > 0 ? "in" : "out",
      note: `inventory-count:${parsed.data.countId}`,
      picked_by: user?.id ?? null,
    }));
    const { error: txErr } = await supabase.from("equipment_pick_transactions").insert(rows);
    if (txErr) {
      return { success: false, message: mapInventoryDbError(txErr, "לא ניתן ליצור תנועות התאמה מהספירה.") };
    }

    const { error: updErr } = await supabase
      .from("inventory_counts")
      .update({ status: "posted", posted_by: user?.id ?? null, posted_at: new Date().toISOString() })
      .eq("id", parsed.data.countId);
    if (updErr) {
      return { success: false, message: mapInventoryDbError(updErr) };
    }

    return {
      success: true,
      message: `הספירה אושרה ונוצרו ${rows.length} תנועות התאמה.`,
      data: { adjusted: rows.length },
    };
  } catch (error) {
    console.error("postInventoryCount failed", toServerError(error));
    return { success: false, message: mapInventoryDbError(error) };
  }
}
