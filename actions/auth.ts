"use server";

import { redirect } from "next/navigation";
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
