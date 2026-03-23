"use server";

import { z } from "zod";

import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import type { PaymentRow, PaymentType } from "@/types/payments";
import { sanitizeText } from "@/utils/sanitize";

const paymentTypeSchema = z.enum(["deposit", "balance", "other"]);

export async function listPaymentsForProject(projectId: string): Promise<PaymentRow[]> {
  const parsed = z.string().uuid().safeParse(projectId);
  if (!parsed.success) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, project_id, amount, type, paid_at, note")
    .eq("project_id", parsed.data)
    .order("paid_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as unknown as PaymentRow[];
}

const recordPaymentSchema = z.object({
  projectId: z.string().uuid(),
  amount: z.coerce.number().positive("סכום חייב להיות חיובי"),
  type: paymentTypeSchema,
  paidAt: z.string().min(1, "נא לבחור תאריך תשלום"),
  note: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v ? sanitizeText(v) : "")),
});

function toIsoPaidAt(value: string): string | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toISOString();
}

export async function recordPayment(payload: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = recordPaymentSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "נתוני תשלום לא תקינים." };
  }

  const paidAtIso = toIsoPaidAt(parsed.data.paidAt);
  if (!paidAtIso) {
    return { success: false, message: "תאריך תשלום לא תקין." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("payments")
      .insert({
        project_id: parsed.data.projectId,
        amount: parsed.data.amount,
        type: parsed.data.type as PaymentType,
        paid_at: paidAtIso,
        note: parsed.data.note || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "התשלום נרשם.",
      data: { id: data.id as string },
    };
  } catch (error) {
    console.error("recordPayment failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function recordPaymentFromForm(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }> | null> {
  return recordPayment({
    projectId: formData.get("projectId"),
    amount: formData.get("amount"),
    type: formData.get("type"),
    paidAt: formData.get("paidAt"),
    note: formData.get("note"),
  });
}
