"use server";

import { z } from "zod";

import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import type { EmployeeRow, EmployeeType } from "@/types/employees";
import { sanitizeText } from "@/utils/sanitize";

const employeeTypeSchema = z.enum(["fixed", "hourly", "agency"]);

const createEmployeeSchema = z.object({
  name: z
    .string()
    .min(2, "שם חייב להכיל לפחות 2 תווים")
    .max(120)
    .transform((v) => sanitizeText(v)),
  type: employeeTypeSchema,
  hourlyRate: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") {
      return undefined;
    }
    const n = typeof v === "number" ? v : Number(v);
    return Number.isNaN(n) ? undefined : n;
  }, z.number().min(0).max(99999).optional()),
  availabilityNote: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v ? sanitizeText(v) : "")),
});

export async function listEmployees(): Promise<EmployeeRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, name, type, hourly_rate, availability_note, created_at")
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as EmployeeRow[];
}

export async function createEmployee(
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createEmployeeSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "יש שדות לא תקינים." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("employees")
      .insert({
        name: parsed.data.name,
        type: parsed.data.type as EmployeeType,
        hourly_rate:
          parsed.data.type === "hourly" && parsed.data.hourlyRate !== undefined
            ? parsed.data.hourlyRate
            : null,
        availability_note: parsed.data.availabilityNote || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "העובד נוסף.",
      data: { id: data.id as string },
    };
  } catch (error) {
    console.error("createEmployee failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function createEmployeeFromForm(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }> | null> {
  return createEmployee({
    name: formData.get("name"),
    type: formData.get("type"),
    hourlyRate: formData.get("hourlyRate"),
    availabilityNote: formData.get("availabilityNote"),
  });
}
