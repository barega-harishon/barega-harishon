"use server";

import { z } from "zod";

import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { refreshTruckStatusFromProjectsRpc } from "@/lib/trucks/refresh-status";
import type { ActionResult } from "@/types/common";
import type { TruckRow, TruckStatusValue } from "@/types/trucks";
import { TRUCK_STATUS_VALUES } from "@/types/trucks";
import { sanitizeText } from "@/utils/sanitize";

const truckStatusSchema = z.enum(
  TRUCK_STATUS_VALUES as unknown as [TruckStatusValue, ...TruckStatusValue[]],
);

function normalizeTruckRowFromDb(row: Record<string, unknown>): TruckRow {
  const driver = row.driver as TruckRow["driver"];
  return {
    id: String(row.id),
    license_plate: String(row.license_plate ?? ""),
    display_name: typeof row.display_name === "string" ? row.display_name : "",
    notes: typeof row.notes === "string" ? row.notes : row.notes === null ? null : null,
    driver_id: typeof row.driver_id === "string" ? row.driver_id : null,
    status: String(row.status ?? "available"),
    created_at: String(row.created_at ?? ""),
    driver: driver ?? null,
  };
}

const createTruckSchema = z.object({
  displayName: z.preprocess(
    (v) => (typeof v === "string" ? v : ""),
    z.string().max(120).transform((s) => sanitizeText(s.trim())),
  ),
  notes: z.preprocess(
    (v) => (typeof v === "string" ? v : ""),
    z
      .string()
      .max(2000)
      .transform((s) => {
        const t = s.trim();
        return t.length > 0 ? sanitizeText(t) : null;
      }),
  ),
  licensePlate: z
    .string()
    .min(2, "מספר רישוי קצר מדי")
    .max(40)
    .transform((v) => sanitizeText(v.trim().toUpperCase())),
  driverId: z
    .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && v !== "" ? v : null)),
  status: truckStatusSchema,
});

export async function listTrucks(): Promise<TruckRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("trucks")
    .select(
      `
      id,
      license_plate,
      display_name,
      notes,
      driver_id,
      status,
      created_at,
      driver:driver_id ( id, name )
    `,
    )
    .order("license_plate", { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data as Record<string, unknown>[]).map((r) => normalizeTruckRowFromDb(r));
}

export async function getTruckById(id: string): Promise<TruckRow | null> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("trucks")
    .select(
      `
      id,
      license_plate,
      display_name,
      notes,
      driver_id,
      status,
      created_at,
      driver:driver_id ( id, name )
    `,
    )
    .eq("id", parsed.data)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeTruckRowFromDb(data as Record<string, unknown>);
}

export async function createTruck(payload: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createTruckSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "יש שדות לא תקינים." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("trucks")
      .insert({
        license_plate: parsed.data.licensePlate,
        display_name: parsed.data.displayName ?? "",
        notes: parsed.data.notes,
        driver_id: parsed.data.driverId,
        status: parsed.data.status,
      })
      .select("id")
      .single();

    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") {
        return { success: false, message: "מספר רישוי זה כבר קיים במערכת." };
      }
      return { success: false, message: getSafeClientErrorMessage() };
    }

    if (!data) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "המשאית נוספה.",
      data: { id: data.id as string },
    };
  } catch (error) {
    console.error("createTruck failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

const updateTruckSchema = createTruckSchema.extend({
  id: z.string().uuid(),
});

export async function updateTruck(payload: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = updateTruckSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "יש שדות לא תקינים." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("trucks")
      .update({
        license_plate: parsed.data.licensePlate,
        display_name: parsed.data.displayName ?? "",
        notes: parsed.data.notes,
        driver_id: parsed.data.driverId,
        status: parsed.data.status,
      })
      .eq("id", parsed.data.id);

    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") {
        return { success: false, message: "מספר רישוי זה כבר קיים במערכת." };
      }
      return { success: false, message: getSafeClientErrorMessage() };
    }

    await refreshTruckStatusFromProjectsRpc(parsed.data.id);

    return {
      success: true,
      message: "פרטי המשאית עודכנו.",
      data: { id: parsed.data.id },
    };
  } catch (error) {
    console.error("updateTruck failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function createTruckFromForm(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }> | null> {
  return createTruck({
    displayName: formData.get("displayName"),
    notes: formData.get("notes"),
    licensePlate: formData.get("licensePlate"),
    driverId: formData.get("driverId"),
    status: formData.get("status"),
  });
}

export async function updateTruckFromForm(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }> | null> {
  return updateTruck({
    id: formData.get("id"),
    displayName: formData.get("displayName"),
    notes: formData.get("notes"),
    licensePlate: formData.get("licensePlate"),
    driverId: formData.get("driverId"),
    status: formData.get("status"),
  });
}

const deleteTruckSchema = z.object({
  id: z.string().uuid(),
});

export async function deleteTruck(payload: unknown): Promise<ActionResult<Record<string, never>>> {
  const parsed = deleteTruckSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("trucks").delete().eq("id", parsed.data.id);

    if (error) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return { success: true, message: "המשאית הוסרה מהמערכת." };
  } catch (error) {
    console.error("deleteTruck failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}
