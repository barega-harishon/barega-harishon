"use server";

import { z } from "zod";

import { getCurrentAppRole } from "@/lib/auth/current-profile";
import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOfficeOrAdminRole } from "@/types/app-role";
import type { ActionResult } from "@/types/common";
import type {
  EquipmentBatchAvailabilityRow,
  EquipmentPickSelectionInput,
  EquipmentPurchaseBatchRow,
} from "@/types/equipment-batches";

const batchSchema = z.object({
  equipmentId: z.string().uuid(),
  purchasedAt: z.string().min(1, "נא להזין תאריך רכישה"),
  quantity: z.coerce.number().int().min(1, "כמות חייבת להיות לפחות 1").max(1_000_000),
  unitCost: z.coerce.number().min(0, "מחיר יחידה לא תקין").max(999_999_999),
  supplierName: z.string().max(120).optional(),
  referenceNo: z.string().max(120).optional(),
  note: z.string().max(2000).optional(),
});

const updateBatchSchema = batchSchema.extend({
  id: z.string().uuid(),
});

const deleteBatchSchema = z.object({
  id: z.string().uuid(),
});

const pickPayloadSchema = z.object({
  equipmentId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  source: z.enum(["project", "warehouse"]),
  note: z.string().max(1000).optional(),
  selections: z.array(
    z.object({
      batchId: z.string().uuid(),
      quantity: z.coerce.number().int().min(1).max(1_000_000),
      checked: z.boolean(),
    }),
  ),
});

function normalizeDateToIsoDate(value: string): string | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toISOString().slice(0, 10);
}

export async function listEquipmentPurchaseBatches(
  equipmentId: string,
): Promise<EquipmentPurchaseBatchRow[]> {
  const parsed = z.string().uuid().safeParse(equipmentId);
  if (!parsed.success) {
    return [];
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("equipment_purchase_batches")
    .select(
      "id, equipment_id, purchased_at, quantity, unit_cost, supplier_name, reference_no, note, created_at",
    )
    .eq("equipment_id", parsed.data)
    .order("purchased_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }
  return data as EquipmentPurchaseBatchRow[];
}

export async function listEquipmentBatchAvailability(
  equipmentId: string,
): Promise<EquipmentBatchAvailabilityRow[]> {
  const batches = await listEquipmentPurchaseBatches(equipmentId);
  if (batches.length === 0) {
    return [];
  }
  const supabase = await createServerSupabaseClient();
  const batchIds = batches.map((b) => b.id);
  const { data: tx } = await supabase
    .from("equipment_pick_transactions")
    .select("batch_id, quantity")
    .in("batch_id", batchIds);

  const byBatch = new Map<string, number>();
  for (const row of tx ?? []) {
    const key = row.batch_id as string;
    const q = Number(row.quantity);
    byBatch.set(key, (byBatch.get(key) ?? 0) + (Number.isNaN(q) ? 0 : q));
  }

  return batches.map((b) => {
    const picked = byBatch.get(b.id) ?? 0;
    return {
      ...b,
      picked_qty: picked,
      remaining_qty: Math.max(0, Number(b.quantity) - picked),
    };
  });
}

export async function listEquipmentBatchAvailabilityForEquipmentIds(
  equipmentIds: string[],
): Promise<Record<string, EquipmentBatchAvailabilityRow[]>> {
  const uniq = [...new Set(equipmentIds.filter(Boolean))];
  const out: Record<string, EquipmentBatchAvailabilityRow[]> = {};
  await Promise.all(
    uniq.map(async (id) => {
      out[id] = await listEquipmentBatchAvailability(id);
    }),
  );
  return out;
}

export async function createEquipmentPurchaseBatch(
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = batchSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "נתוני אצווה לא תקינים." };
  }
  try {
    const role = await getCurrentAppRole();
    if (!(isOfficeOrAdminRole(role) || role === "warehouse")) {
      return { success: false, message: "אין הרשאה להוסיף אצווה." };
    }
    const purchasedAt = normalizeDateToIsoDate(parsed.data.purchasedAt);
    if (!purchasedAt) {
      return { success: false, message: "תאריך רכישה לא תקין." };
    }
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("equipment_purchase_batches")
      .insert({
        equipment_id: parsed.data.equipmentId,
        purchased_at: purchasedAt,
        quantity: parsed.data.quantity,
        unit_cost: parsed.data.unitCost,
        supplier_name: parsed.data.supplierName?.trim() || null,
        reference_no: parsed.data.referenceNo?.trim() || null,
        note: parsed.data.note?.trim() || null,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, message: getSafeClientErrorMessage() };
    }
    return { success: true, message: "האצווה נוספה.", data: { id: data.id as string } };
  } catch (error) {
    console.error("createEquipmentPurchaseBatch failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function createEquipmentPurchaseBatchFromForm(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }> | null> {
  return createEquipmentPurchaseBatch({
    equipmentId: formData.get("equipmentId"),
    purchasedAt: formData.get("purchasedAt"),
    quantity: formData.get("quantity"),
    unitCost: formData.get("unitCost"),
    supplierName: formData.get("supplierName"),
    referenceNo: formData.get("referenceNo"),
    note: formData.get("note"),
  });
}

export async function updateEquipmentPurchaseBatch(
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateBatchSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "נתוני אצווה לא תקינים." };
  }
  try {
    const role = await getCurrentAppRole();
    if (!(isOfficeOrAdminRole(role) || role === "warehouse")) {
      return { success: false, message: "אין הרשאה לעריכת אצווה." };
    }
    const purchasedAt = normalizeDateToIsoDate(parsed.data.purchasedAt);
    if (!purchasedAt) {
      return { success: false, message: "תאריך רכישה לא תקין." };
    }
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("equipment_purchase_batches")
      .update({
        purchased_at: purchasedAt,
        quantity: parsed.data.quantity,
        unit_cost: parsed.data.unitCost,
        supplier_name: parsed.data.supplierName?.trim() || null,
        reference_no: parsed.data.referenceNo?.trim() || null,
        note: parsed.data.note?.trim() || null,
      })
      .eq("id", parsed.data.id);
    if (error) {
      return { success: false, message: getSafeClientErrorMessage() };
    }
    return { success: true, message: "האצווה עודכנה.", data: { id: parsed.data.id } };
  } catch (error) {
    console.error("updateEquipmentPurchaseBatch failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function deleteEquipmentPurchaseBatch(
  payload: unknown,
): Promise<ActionResult<Record<string, never>>> {
  const parsed = deleteBatchSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }
  try {
    const role = await getCurrentAppRole();
    if (role !== "admin") {
      return { success: false, message: "רק אדמין רשאי למחוק אצווה." };
    }
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("equipment_purchase_batches").delete().eq("id", parsed.data.id);
    if (error) {
      return { success: false, message: getSafeClientErrorMessage() };
    }
    return { success: true, message: "האצווה נמחקה." };
  } catch (error) {
    console.error("deleteEquipmentPurchaseBatch failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function createEquipmentPickTransactions(
  payload: unknown,
): Promise<ActionResult<{ inserted: number }>> {
  const parsed = pickPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "נתוני ליקוט לא תקינים." };
  }
  try {
    const role = await getCurrentAppRole();
    if (parsed.data.source === "warehouse") {
      if (!(isOfficeOrAdminRole(role) || role === "warehouse")) {
        return { success: false, message: "אין הרשאה לליקוט גלובלי." };
      }
    } else if (!(role === "admin" || role === "office" || role === "operations" || role === "warehouse")) {
      return { success: false, message: "אין הרשאה לליקוט לפרויקט." };
    }

    const selected: EquipmentPickSelectionInput[] = parsed.data.selections.filter((s) => s.checked);
    if (selected.length === 0) {
      return { success: false, message: "נא לבחור לפחות אצווה אחת לליקוט." };
    }
    if (parsed.data.source === "project" && !parsed.data.projectId) {
      return { success: false, message: "ליקוט פרויקט דורש מזהה פרויקט." };
    }
    if (parsed.data.source === "warehouse" && parsed.data.projectId) {
      return { success: false, message: "בליקוט גלובלי אין פרויקט משויך." };
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const avail = await listEquipmentBatchAvailability(parsed.data.equipmentId);
    const byBatch = new Map(avail.map((a) => [a.id, a]));

    let totalPickQty = 0;
    for (const s of selected) {
      const row = byBatch.get(s.batchId);
      if (!row) {
        return { success: false, message: "נמצאה אצווה לא תקינה." };
      }
      if (s.quantity > row.remaining_qty) {
        return { success: false, message: `לא ניתן ללַקֵט יותר מהיתרה באצווה מתאריך ${row.purchased_at}.` };
      }
      totalPickQty += s.quantity;
    }

    if (parsed.data.source === "project" && parsed.data.projectId) {
      const { data: line } = await supabase
        .from("project_equipment")
        .select("quantity, picked_qty")
        .eq("project_id", parsed.data.projectId)
        .eq("equipment_id", parsed.data.equipmentId)
        .maybeSingle();

      const requiredQty = Number(line?.quantity ?? 0);
      const alreadyPicked = Number(line?.picked_qty ?? 0);
      const remainingNeed = Math.max(0, requiredQty - alreadyPicked);
      if (remainingNeed <= 0) {
        return { success: false, message: "אין יתרת צורך לפרויקט עבור פריט זה." };
      }
      if (totalPickQty > remainingNeed) {
        return { success: false, message: "כמות הליקוט גדולה מהיתרה הנדרשת לפרויקט." };
      }
    }

    const rows = selected.map((s) => ({
      equipment_id: parsed.data.equipmentId,
      project_id: parsed.data.source === "project" ? parsed.data.projectId ?? null : null,
      batch_id: s.batchId,
      quantity: s.quantity,
      source: parsed.data.source,
      note: parsed.data.note?.trim() || null,
      picked_by: user?.id ?? null,
    }));
    const { error } = await supabase.from("equipment_pick_transactions").insert(rows);
    if (error) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "הליקוט נשמר בהצלחה.",
      data: { inserted: rows.length },
    };
  } catch (error) {
    console.error("createEquipmentPickTransactions failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}
