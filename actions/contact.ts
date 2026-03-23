"use server";

import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { contactSchema } from "@/utils/validation";
import type { ActionResult, ContactMessage } from "@/types/common";

export async function submitContactMessage(
  payload: unknown,
): Promise<ActionResult<ContactMessage>> {
  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: "יש שדות לא תקינים. נא לבדוק ולנסות שוב.",
    };
  }

  try {
    const data = parsed.data;
    // The save layer should call Supabase in a dedicated repository module.
    return {
      success: true,
      message: "הפנייה נשלחה בהצלחה.",
      data,
    };
  } catch (error) {
    const serverError = toServerError(error);
    console.error("submitContactMessage failed", {
      message: serverError.message,
      stack: serverError.stack,
    });

    return {
      success: false,
      message: getSafeClientErrorMessage(),
    };
  }
}
