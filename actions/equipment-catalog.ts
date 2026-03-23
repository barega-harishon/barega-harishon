"use server";

import { z } from "zod";

import { getEquipmentAvailabilityMap } from "@/actions/project-equipment";
import { EQUIPMENT_UNCATEGORIZED } from "@/lib/equipment/catalog-constants";
import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import type { EquipmentRow, EquipmentRowWithAvailability } from "@/types/equipment-catalog";
import { sanitizeText } from "@/utils/sanitize";

const equipmentFieldsSchema = z.object({
  name: z
    .string()
    .min(1, "נא להזין שם פריט")
    .max(120, "שם ארוך מדי")
    .transform((v) => sanitizeText(v)),
  category: z
    .string()
    .max(100)
    .optional()
    .transform((v) => (v ? sanitizeText(v) : "")),
  totalQty: z.coerce.number().int().min(0, "כמות לא תקינה").max(999_999),
  rentPrice: z.coerce.number().min(0, "מחיר לא תקין").max(99_999_999),
  warehouseLocation: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v ? sanitizeText(v) : "")),
});

export async function listEquipmentRows(categoryFilter?: string | null): Promise<EquipmentRow[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("equipment")
    .select("id, name, category, total_qty, rent_price, warehouse_location, created_at")
    .order("name", { ascending: true });

  if (categoryFilter === EQUIPMENT_UNCATEGORIZED) {
    query = query.eq("category", "");
  } else if (categoryFilter && categoryFilter.trim() !== "") {
    query = query.eq("category", categoryFilter.trim());
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data as EquipmentRow[];
}

export async function listEquipmentCategoryOptions(): Promise<{
  categories: string[];
  hasUncategorized: boolean;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("equipment").select("category");

  if (error || !data) {
    return { categories: [], hasUncategorized: false };
  }

  const set = new Set<string>();
  let hasUncategorized = false;

  for (const row of data) {
    const c = typeof row.category === "string" ? row.category : "";
    if (c === "") {
      hasUncategorized = true;
    } else {
      set.add(c);
    }
  }

  const categories = [...set].sort((a, b) => a.localeCompare(b, "he"));

  return { categories, hasUncategorized };
}

export async function listEquipmentRowsWithAvailability(
  categoryFilter?: string | null,
): Promise<EquipmentRowWithAvailability[]> {
  const [rows, availability] = await Promise.all([
    listEquipmentRows(categoryFilter),
    getEquipmentAvailabilityMap(),
  ]);

  return rows.map((row) => {
    const snap = availability[row.id];
    return {
      ...row,
      allocated: snap?.allocated ?? 0,
      available: snap?.available ?? row.total_qty,
    };
  });
}

export async function getEquipmentRowById(id: string): Promise<EquipmentRow | null> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("id, name, category, total_qty, rent_price, warehouse_location, created_at")
    .eq("id", parsed.data)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as EquipmentRow;
}

export async function createEquipment(
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = equipmentFieldsSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "יש שדות לא תקינים." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("equipment")
      .insert({
        name: parsed.data.name,
        category: parsed.data.category || "",
        total_qty: parsed.data.totalQty,
        rent_price: parsed.data.rentPrice,
        warehouse_location: parsed.data.warehouseLocation || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "הפריט נוסף למלאי.",
      data: { id: data.id as string },
    };
  } catch (error) {
    console.error("createEquipment failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

const updateEquipmentSchema = equipmentFieldsSchema.extend({
  id: z.string().uuid(),
});

export async function updateEquipment(
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateEquipmentSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "יש שדות לא תקינים." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("equipment")
      .update({
        name: parsed.data.name,
        category: parsed.data.category || "",
        total_qty: parsed.data.totalQty,
        rent_price: parsed.data.rentPrice,
        warehouse_location: parsed.data.warehouseLocation || null,
      })
      .eq("id", parsed.data.id);

    if (error) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "הפריט עודכן.",
      data: { id: parsed.data.id },
    };
  } catch (error) {
    console.error("updateEquipment failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function createEquipmentFromForm(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }> | null> {
  return createEquipment({
    name: formData.get("name"),
    category: formData.get("category"),
    totalQty: formData.get("totalQty"),
    rentPrice: formData.get("rentPrice"),
    warehouseLocation: formData.get("warehouseLocation"),
  });
}

export async function updateEquipmentFromForm(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }> | null> {
  return updateEquipment({
    id: formData.get("id"),
    name: formData.get("name"),
    category: formData.get("category"),
    totalQty: formData.get("totalQty"),
    rentPrice: formData.get("rentPrice"),
    warehouseLocation: formData.get("warehouseLocation"),
  });
}

const deleteEquipmentSchema = z.object({
  id: z.string().uuid(),
});

export async function deleteEquipment(payload: unknown): Promise<ActionResult<Record<string, never>>> {
  const parsed = deleteEquipmentSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("equipment").delete().eq("id", parsed.data.id);

    if (error) {
      const code = (error as { code?: string }).code;
      const msg = error.message ?? "";
      if (code === "23503" || msg.toLowerCase().includes("foreign key")) {
        return {
          success: false,
          message: "לא ניתן למחוק: הפריט משובץ בפרויקטים. הסירו שורות ציוד תחילה.",
        };
      }
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return { success: true, message: "הפריט נמחק מהקטלוג." };
  } catch (error) {
    console.error("deleteEquipment failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}
