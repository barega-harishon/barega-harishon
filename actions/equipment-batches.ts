"use server";

import { z } from "zod";

import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasAnyAppRole, isOfficeOrAdminRole } from "@/types/app-role";
import type { ActionResult } from "@/types/common";
import type {
  EquipmentAdjustmentDirection,
  EquipmentBatchAvailabilityRow,
  EquipmentPickSelectionInput,
  EquipmentPurchaseBatchRow,
  EquipmentStockTxType,
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
  txType: z.enum(["pick", "return", "adjustment"]).default("pick"),
  adjustmentDirection: z.enum(["in", "out"]).optional(),
  note: z.string().max(1000).optional(),
  selections: z.array(
    z.object({
      batchId: z.string().uuid(),
      quantity: z.coerce.number().int().min(1).max(1_000_000),
      checked: z.boolean(),
    }),
  ),
});

function signedQtyFromTx(
  quantity: number,
  txType: EquipmentStockTxType,
  adjustmentDirection?: EquipmentAdjustmentDirection | null,
): number {
  if (txType === "return") {
    return Math.abs(quantity);
  }
  if (txType === "adjustment") {
    return adjustmentDirection === "in" ? Math.abs(quantity) : -Math.abs(quantity);
  }
  return -Math.abs(quantity);
}

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
    .select("batch_id, quantity, tx_type, adjustment_direction")
    .in("batch_id", batchIds);

  const byBatch = new Map<string, number>();
  for (const row of tx ?? []) {
    const key = row.batch_id as string;
    const q = Number(row.quantity);
    const signed = Number.isNaN(q)
      ? 0
      : signedQtyFromTx(
          q,
          (row.tx_type as EquipmentStockTxType | null) ?? "pick",
          (row.adjustment_direction as EquipmentAdjustmentDirection | null) ?? undefined,
        );
    byBatch.set(key, (byBatch.get(key) ?? 0) + signed);
  }

  return batches.map((b) => {
    const signedBalance = byBatch.get(b.id) ?? 0;
    const netPicked = Math.max(0, -signedBalance);
    return {
      ...b,
      picked_qty: netPicked,
      remaining_qty: Math.max(0, Number(b.quantity) + signedBalance),
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
    const roles = await getCurrentAppRoles();
    if (!(isOfficeOrAdminRole(roles) || roles.includes("warehouse"))) {
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
    const roles = await getCurrentAppRoles();
    if (!(isOfficeOrAdminRole(roles) || roles.includes("warehouse"))) {
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
    const roles = await getCurrentAppRoles();
    if (!roles.includes("admin")) {
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
    const roles = await getCurrentAppRoles();
    if (parsed.data.txType === "return" || parsed.data.txType === "adjustment") {
      if (!(isOfficeOrAdminRole(roles) || roles.includes("warehouse"))) {
        return { success: false, message: "אין הרשאה לפעולת החזרה/התאמה." };
      }
    } else if (parsed.data.source === "warehouse") {
      if (!(isOfficeOrAdminRole(roles) || roles.includes("warehouse"))) {
        return { success: false, message: "אין הרשאה לליקוט גלובלי." };
      }
    } else if (!hasAnyAppRole(roles, ["admin", "office", "operations", "warehouse"])) {
      return { success: false, message: "אין הרשאה לליקוט לפרויקט." };
    }

    const selected: EquipmentPickSelectionInput[] = parsed.data.selections.filter((s) => s.checked);
    if (selected.length === 0) {
      return { success: false, message: "נא לבחור לפחות אצווה אחת לליקוט." };
    }
    if (
      (parsed.data.source === "project" || parsed.data.txType === "return") &&
      !parsed.data.projectId
    ) {
      return { success: false, message: "ליקוט פרויקט דורש מזהה פרויקט." };
    }
    if (
      (parsed.data.source === "warehouse" || parsed.data.txType === "adjustment") &&
      parsed.data.projectId
    ) {
      return { success: false, message: "בליקוט גלובלי אין פרויקט משויך." };
    }
    if (parsed.data.txType === "return" && parsed.data.source !== "project") {
      return { success: false, message: "החזרה מוגדרת כפעולת פרויקט." };
    }
    if (parsed.data.txType === "adjustment" && parsed.data.source !== "warehouse") {
      return { success: false, message: "התאמת ספירה היא פעולת מחסן." };
    }
    if (parsed.data.txType === "adjustment" && !parsed.data.adjustmentDirection) {
      return { success: false, message: "יש לבחור כיוון התאמה (הגדלה/הפחתה)." };
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
      if (parsed.data.txType === "pick" && s.quantity > row.remaining_qty) {
        return {
          success: false,
          message: `לא ניתן ללַקֵט יותר מהיתרה באצווה מתאריך ${row.purchased_at}.`,
        };
      }
      totalPickQty += s.quantity;
    }

    if (parsed.data.txType === "pick" && parsed.data.source === "project" && parsed.data.projectId) {
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

    if (parsed.data.txType === "return" && parsed.data.projectId) {
      const { data: projectTx } = await supabase
        .from("equipment_pick_transactions")
        .select("batch_id, quantity, tx_type")
        .eq("project_id", parsed.data.projectId)
        .eq("equipment_id", parsed.data.equipmentId)
        .eq("source", "project")
        .in("batch_id", selected.map((s) => s.batchId));

      const netByBatch = new Map<string, number>();
      for (const row of projectTx ?? []) {
        const batchId = String(row.batch_id);
        const qty = Number(row.quantity);
        const txType = (row.tx_type as EquipmentStockTxType | null) ?? "pick";
        const signed = txType === "return" ? -Math.abs(qty) : Math.abs(qty);
        netByBatch.set(batchId, (netByBatch.get(batchId) ?? 0) + signed);
      }
      for (const s of selected) {
        const returnable = Math.max(0, netByBatch.get(s.batchId) ?? 0);
        if (s.quantity > returnable) {
          return { success: false, message: "כמות ההחזרה חורגת מהכמות שנלקטה לפרויקט באצווה זו." };
        }
      }
    }

    const rows = selected.map((s) => ({
      equipment_id: parsed.data.equipmentId,
      project_id:
        parsed.data.txType === "adjustment"
          ? null
          : parsed.data.source === "project"
            ? parsed.data.projectId ?? null
            : null,
      batch_id: parsed.data.txType === "adjustment" ? null : s.batchId,
      quantity: s.quantity,
      source: parsed.data.source,
      tx_type: parsed.data.txType,
      adjustment_direction: parsed.data.txType === "adjustment" ? parsed.data.adjustmentDirection : null,
      note: parsed.data.note?.trim() || null,
      picked_by: user?.id ?? null,
    }));
    const { error } = await supabase.from("equipment_pick_transactions").insert(rows);
    if (error) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message:
        parsed.data.txType === "return"
          ? "ההחזרה נשמרה בהצלחה."
          : parsed.data.txType === "adjustment"
            ? "התאמת המלאי נשמרה בהצלחה."
            : "הליקוט נשמר בהצלחה.",
      data: { inserted: rows.length },
    };
  } catch (error) {
    console.error("createEquipmentPickTransactions failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

const autoProjectPickSchema = z.object({
  projectId: z.string().uuid(),
  equipmentId: z.string().uuid(),
});

export async function autoPickProjectEquipmentRemaining(
  payload: unknown,
): Promise<ActionResult<{ inserted: number }>> {
  const parsed = autoProjectPickSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "נתונים לא תקינים לפעולת ליקוט אוטומטית." };
  }

  try {
    const supabase = await createServerSupabaseClient();
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
      return { success: false, message: "אין יתרה חסרה לליקוט בפריט זה." };
    }

    const batches = await listEquipmentBatchAvailability(parsed.data.equipmentId);
    const fifo = [...batches].sort((a, b) => {
      const aTs = new Date(a.purchased_at).getTime();
      const bTs = new Date(b.purchased_at).getTime();
      return aTs - bTs;
    });

    let remaining = remainingNeed;
    const selections: EquipmentPickSelectionInput[] = [];
    for (const batch of fifo) {
      if (remaining <= 0) {
        break;
      }
      if (batch.remaining_qty <= 0) {
        continue;
      }
      const qty = Math.min(remaining, batch.remaining_qty);
      if (qty <= 0) {
        continue;
      }
      selections.push({ batchId: batch.id, quantity: qty, checked: true });
      remaining -= qty;
    }

    if (selections.length === 0) {
      return { success: false, message: "אין אצוות זמינות לליקוט עבור פריט זה." };
    }

    return createEquipmentPickTransactions({
      equipmentId: parsed.data.equipmentId,
      projectId: parsed.data.projectId,
      source: "project",
      txType: "pick",
      selections,
    });
  } catch (error) {
    console.error("autoPickProjectEquipmentRemaining failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function autoReturnProjectEquipmentPicked(
  payload: unknown,
): Promise<ActionResult<{ inserted: number }>> {
  const parsed = autoProjectPickSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "נתונים לא תקינים לפעולת החזרה אוטומטית." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: projectTx } = await supabase
      .from("equipment_pick_transactions")
      .select("batch_id, quantity, tx_type")
      .eq("project_id", parsed.data.projectId)
      .eq("equipment_id", parsed.data.equipmentId)
      .eq("source", "project");

    const netByBatch = new Map<string, number>();
    for (const row of projectTx ?? []) {
      const batchId = String(row.batch_id ?? "");
      if (!batchId) {
        continue;
      }
      const qty = Number(row.quantity);
      if (Number.isNaN(qty) || qty <= 0) {
        continue;
      }
      const txType = (row.tx_type as EquipmentStockTxType | null) ?? "pick";
      const signed = txType === "return" ? -Math.abs(qty) : Math.abs(qty);
      netByBatch.set(batchId, (netByBatch.get(batchId) ?? 0) + signed);
    }

    const selections: EquipmentPickSelectionInput[] = [];
    for (const [batchId, netPicked] of netByBatch) {
      if (netPicked <= 0) {
        continue;
      }
      selections.push({
        batchId,
        quantity: netPicked,
        checked: true,
      });
    }

    if (selections.length === 0) {
      return { success: false, message: "אין כמות שנלקטה להחזרה בפריט זה." };
    }

    return createEquipmentPickTransactions({
      equipmentId: parsed.data.equipmentId,
      projectId: parsed.data.projectId,
      source: "project",
      txType: "return",
      selections,
    });
  } catch (error) {
    console.error("autoReturnProjectEquipmentPicked failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}
