"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { userMustChangePassword } from "@/lib/auth/must-change-password";
import { getSafeClientErrorMessage } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";

const mandatoryChangeSchema = z
  .object({
    password: z.string().min(8, "הסיסמה חייבת להכיל לפחות 8 תווים"),
    confirmPassword: z.string().min(8, "נא לאשר סיסמה"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "הסיסמאות אינן תואמות",
    path: ["confirmPassword"],
  });

/** לאחר יצירת משתמש ע״י אדמין — עדכון סיסמה וניקוי דגל user_metadata. */
export async function completeMandatoryPasswordChangeFromForm(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null> | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "נדרשת התחברות." };
  }
  if (!userMustChangePassword(user)) {
    return {
      success: false,
      message: "אין דרישה להחלפת סיסמה כאן. אפשר לחזור לדשבורד.",
    };
  }

  const parsed = mandatoryChangeSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, message: first?.message ?? "נתונים לא תקינים." };
  }

  const existingMeta =
    user.user_metadata && typeof user.user_metadata === "object" && !Array.isArray(user.user_metadata)
      ? { ...user.user_metadata }
      : {};

  try {
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
      data: {
        ...existingMeta,
        must_change_password: false,
      },
    });
    if (error) {
      console.error("completeMandatoryPasswordChangeFromForm failed", error);
      return { success: false, message: getSafeClientErrorMessage() };
    }
  } catch (e) {
    console.error("completeMandatoryPasswordChangeFromForm exception", e);
    return { success: false, message: getSafeClientErrorMessage() };
  }

  redirect("/dashboard");
}
