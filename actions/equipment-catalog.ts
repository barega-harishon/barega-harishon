"use server";

import { z } from "zod";

import { getEquipmentAvailabilityMap } from "@/actions/project-equipment";
import { EQUIPMENT_UNCATEGORIZED } from "@/lib/equipment/catalog-constants";
import {
  isAllowedEquipmentCategory,
  mergeCategoryFilterOptions,
} from "@/lib/equipment/equipment-categories";
import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import type { EquipmentRow, EquipmentRowWithAvailability } from "@/types/equipment-catalog";
import { sanitizeText } from "@/utils/sanitize";

const categoryFieldBase = z.preprocess(
  (v) => (typeof v === "string" ? v : ""),
  z.string().max(100).transform((v) => sanitizeText(v.trim())),
);

const equipmentCreateSchema = z.object({
  name: z
    .string()
    .min(1, "נא להזין שם פריט")
    .max(120, "שם ארוך מדי")
    .transform((v) => sanitizeText(v)),
  category: categoryFieldBase.refine((c) => isAllowedEquipmentCategory(c), {
    message: "נא לבחור קטגוריה מהרשימה או \"ללא קטגוריה\".",
  }),
  totalQty: z.coerce.number().int().min(0, "כמות לא תקינה").max(999_999),
  rentPrice: z.coerce.number().min(0, "מחיר לא תקין").max(99_999_999),
  warehouseLocation: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v ? sanitizeText(v) : "")),
});

const equipmentUpdateSchema = equipmentCreateSchema.extend({
  id: z.string().uuid(),
});

export async function listEquipmentRows(filter?: {
  categories?: string | string[] | null;
  search?: string | null;
}): Promise<EquipmentRow[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("equipment")
    .select("id, name, category, total_qty, rent_price, warehouse_location, created_at")
    .order("name", { ascending: true });

  const categoryFilter = filter?.categories;
  const filters = Array.isArray(categoryFilter)
    ? categoryFilter.map((v) => v.trim()).filter(Boolean)
    : typeof categoryFilter === "string" && categoryFilter.trim() !== ""
      ? [categoryFilter.trim()]
      : [];
  if (filters.length > 0) {
    const includesUncategorized = filters.includes(EQUIPMENT_UNCATEGORIZED);
    const namedCats = filters.filter((f) => f !== EQUIPMENT_UNCATEGORIZED);
    if (includesUncategorized && namedCats.length > 0) {
      query = query.or(`category.eq.,category.in.(${namedCats.map((c) => `"${c}"`).join(",")})`);
    } else if (includesUncategorized) {
      query = query.eq("category", "");
    } else if (namedCats.length === 1) {
      query = query.eq("category", namedCats[0]);
    } else if (namedCats.length > 1) {
      query = query.in("category", namedCats);
    }
  }

  const search = (filter?.search ?? "").trim().replace(/[%_,]/g, "").slice(0, 80);
  if (search.length >= 2) {
    const pattern = `%${search}%`;
    query = query.or(
      `name.ilike.${pattern},category.ilike.${pattern},warehouse_location.ilike.${pattern}`,
    );
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

  const fromDb = [...set].sort((a, b) => a.localeCompare(b, "he"));
  const categories = mergeCategoryFilterOptions(fromDb);

  return { categories, hasUncategorized };
}

export async function listEquipmentRowsWithAvailability(
  filter?: {
    categories?: string | string[] | null;
    search?: string | null;
  },
): Promise<EquipmentRowWithAvailability[]> {
  const [rows, availability] = await Promise.all([
    listEquipmentRows(filter),
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
  const parsed = equipmentCreateSchema.safeParse(payload);
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

export async function updateEquipment(
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = equipmentUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "יש שדות לא תקינים." };
  }

  const existing = await getEquipmentRowById(parsed.data.id);
  const prevCat = (existing?.category ?? "").trim();
  if (!isAllowedEquipmentCategory(parsed.data.category) && parsed.data.category !== prevCat) {
    return {
      success: false,
      message: "נא לבחור קטגוריה מהרשימה (או להשאיר את הקטגוריה הקיימת).",
    };
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
