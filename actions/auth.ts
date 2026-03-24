"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { getSafeClientErrorMessage } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/utils/sanitize";

const loginSchema = z.object({
  email: z.string().email("כתובת דוא״ל אינה תקינה").transform(normalizeEmail),
  password: z.string().min(1, "נא להזין סיסמה"),
});

export async function signInWithPassword(
  _prevState: { message: string } | null,
  formData: FormData,
): Promise<{ message: string } | null> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { message: first?.message ?? "נתונים לא תקינים." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return {
        message: "ההתחברות נכשלה. בדקו דוא״ל וסיסמה.",
      };
    }
  } catch {
    return { message: getSafeClientErrorMessage() };
  }

  const nextRaw = formData.get("next");
  const nextPath =
    typeof nextRaw === "string" &&
    nextRaw.startsWith("/") &&
    !nextRaw.startsWith("//")
      ? nextRaw
      : "/projects";

  redirect(nextPath);
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const forgotPasswordSchema = z.object({
  email: z.string().email("כתובת דוא״ל אינה תקינה").transform(normalizeEmail),
});

function getBaseUrlFromHeaders(headerList: Headers): string {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  if (!host) {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  }
  return `${protocol}://${host}`;
}

export async function requestPasswordResetFromForm(
  _prevState: { message: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ message: string; success?: boolean } | null> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { message: first?.message ?? "נא להזין כתובת דוא״ל תקינה." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const h = await headers();
    const baseUrl = getBaseUrlFromHeaders(h);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${baseUrl}/reset-password`,
    });
    if (error) {
      return { message: "לא הצלחנו לשלוח קישור כרגע. נסו שוב בעוד רגע." };
    }
    return {
      success: true,
      message: "אם הדוא״ל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה.",
    };
  } catch {
    return { message: getSafeClientErrorMessage() };
  }
}

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "הסיסמה חייבת להכיל לפחות 8 תווים"),
    confirmPassword: z.string().min(8, "נא לאשר סיסמה"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "הסיסמאות אינן תואמות",
    path: ["confirmPassword"],
  });

export async function resetPasswordFromForm(
  _prevState: { message: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ message: string; success?: boolean } | null> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { message: first?.message ?? "פרטי סיסמה לא תקינים." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      return { message: "לא ניתן לאפס סיסמה כרגע. פתחו את הקישור מהמייל מחדש." };
    }
    return { success: true, message: "הסיסמה עודכנה בהצלחה. אפשר להתחבר." };
  } catch {
    return { message: getSafeClientErrorMessage() };
  }
}
