"use server";

import { z } from "zod";

import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import type { EmployeeRow, EmployeeType } from "@/types/employees";
import { sanitizeText } from "@/utils/sanitize";

const employeeTypeSchema = z.enum(["fixed", "hourly", "agency"]);

/** שדות טקסט מהטופס — תמיד מחרוזת (גם ריקה) */
const optStr = (max: number) => z.string().max(max).transform((s) => sanitizeText(s));

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
  phone: optStr(40),
  email: optStr(200),
  nationalId: optStr(20),
  bankName: optStr(120),
  bankBranch: optStr(40),
  bankAccountNumber: optStr(40),
  bankAccountHolder: optStr(120),
  documentsNotes: optStr(4000),
  licensesNotes: optStr(4000),
});

export async function listEmployees(): Promise<EmployeeRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, name, type, hourly_rate, availability_note, created_at, phone, email, national_id, bank_name, bank_branch, bank_account_number, bank_account_holder, documents_notes, licenses_notes",
    )
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

  const d = parsed.data;

  const toNull = (s: string) => (s.length > 0 ? s : null);

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("employees")
      .insert({
        name: d.name,
        type: d.type as EmployeeType,
        hourly_rate:
          d.type === "hourly" && d.hourlyRate !== undefined ? d.hourlyRate : null,
        availability_note: toNull(d.availabilityNote),
        phone: toNull(d.phone),
        email: toNull(d.email),
        national_id: toNull(d.nationalId),
        bank_name: toNull(d.bankName),
        bank_branch: toNull(d.bankBranch),
        bank_account_number: toNull(d.bankAccountNumber),
        bank_account_holder: toNull(d.bankAccountHolder),
        documents_notes: toNull(d.documentsNotes),
        licenses_notes: toNull(d.licensesNotes),
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "החבר נוסף לצוות.",
      data: { id: data.id as string },
    };
  } catch (error) {
    console.error("createEmployee failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

function fd(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
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
    phone: fd(formData, "phone"),
    email: fd(formData, "email"),
    nationalId: fd(formData, "nationalId"),
    bankName: fd(formData, "bankName"),
    bankBranch: fd(formData, "bankBranch"),
    bankAccountNumber: fd(formData, "bankAccountNumber"),
    bankAccountHolder: fd(formData, "bankAccountHolder"),
    documentsNotes: fd(formData, "documentsNotes"),
    licensesNotes: fd(formData, "licensesNotes"),
  });
}
