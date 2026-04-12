"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { getSafeClientErrorMessage } from "@/lib/errors";
import { hasServiceRoleKey, createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import { hasAnyAppRole, type AppRole } from "@/types/app-role";
import { normalizeEmail } from "@/utils/sanitize";

function canLinkEmployeeRole(roles: AppRole[]): boolean {
  return hasAnyAppRole(roles, ["admin", "office"]);
}

async function resolveAuthUserIdFromEmail(email: string): Promise<string | null> {
  if (!hasServiceRoleKey()) {
    return null;
  }
  const admin = createServiceRoleSupabaseClient();
  const normalized = normalizeEmail(email);
  let page = 1;
  const perPage = 200;
  const maxPages = 50;
  while (page <= maxPages) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) {
      return null;
    }
    const hit = data.users.find(
      (u) => typeof u.email === "string" && normalizeEmail(u.email) === normalized,
    );
    if (hit?.id) {
      return hit.id;
    }
    if (page >= (data.lastPage ?? page)) {
      return null;
    }
    page += 1;
  }
  return null;
}

export async function linkEmployeeAuthUserFromForm(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null> | null> {
  const roles = await getCurrentAppRoles();
  if (!canLinkEmployeeRole(roles)) {
    return { success: false, message: "אין הרשאה לקישור חשבון." };
  }

  const employeeParsed = z.string().uuid().safeParse(formData.get("employeeId"));
  if (!employeeParsed.success) {
    return { success: false, message: "מזהה עובד לא תקין." };
  }
  const employeeId = employeeParsed.data;

  const emailRaw = formData.get("email");
  const emailTrim =
    typeof emailRaw === "string" ? emailRaw.trim().slice(0, 200) : "";

  const authUserRaw = formData.get("authUserId");
  const authUserTrim = typeof authUserRaw === "string" ? authUserRaw.trim() : "";
  const authUserUuid = z.string().uuid().safeParse(authUserTrim);

  let targetUserId: string | null = authUserUuid.success ? authUserUuid.data : null;

  if (!targetUserId && !emailTrim) {
    return { success: false, message: "נא למלא דוא״ל או מזהה משתמש (UUID)." };
  }

  if (!targetUserId && emailTrim) {
    const emailParsed = z.string().email().safeParse(emailTrim);
    if (!emailParsed.success) {
      return { success: false, message: "כתובת דוא״ל אינה תקינה." };
    }
    if (!hasServiceRoleKey()) {
      return {
        success: false,
        message: "חיפוש לפי דוא״ל דורש SUPABASE_SERVICE_ROLE_KEY בשרת, או הזינו מזהה משתמש (UUID).",
      };
    }
    targetUserId = await resolveAuthUserIdFromEmail(emailParsed.data);
    if (!targetUserId) {
      return { success: false, message: "לא נמצא משתמש עם דוא״ל זה." };
    }
  }

  if (!targetUserId) {
    return { success: false, message: "חסר מזהה משתמש לקישור." };
  }

  const supabase = await createServerSupabaseClient();

  try {
    const { data: other, error: otherErr } = await supabase
      .from("employees")
      .select("id, name")
      .eq("auth_user_id", targetUserId)
      .neq("id", employeeId)
      .maybeSingle();

    if (otherErr) {
      console.error("linkEmployeeAuthUserFromForm conflict check failed", otherErr);
      return { success: false, message: getSafeClientErrorMessage() };
    }
    if (other) {
      return {
        success: false,
        message: "חשבון ההתחברות כבר משויך לעובד אחר.",
      };
    }

    const { error } = await supabase
      .from("employees")
      .update({ auth_user_id: targetUserId })
      .eq("id", employeeId);

    if (error) {
      console.error("linkEmployeeAuthUserFromForm update failed", error);
      if (error.code === "23505") {
        return { success: false, message: "חשבון זה כבר משויך לרשומה אחרת." };
      }
      return { success: false, message: getSafeClientErrorMessage() };
    }

    revalidatePath("/employees");
    revalidatePath(`/employees/${employeeId}`);
    revalidatePath("/field");
    return { success: true, message: "חשבון ההתחברות שויך לעובד." };
  } catch (e) {
    console.error("linkEmployeeAuthUserFromForm exception", e);
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function unlinkEmployeeAuthUserFromForm(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null> | null> {
  const roles = await getCurrentAppRoles();
  if (!canLinkEmployeeRole(roles)) {
    return { success: false, message: "אין הרשאה." };
  }

  const parsed = z.object({ employeeId: z.string().uuid() }).safeParse({
    employeeId: formData.get("employeeId"),
  });
  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("employees")
      .update({ auth_user_id: null })
      .eq("id", parsed.data.employeeId);

    if (error) {
      console.error("unlinkEmployeeAuthUserFromForm failed", error);
      return { success: false, message: getSafeClientErrorMessage() };
    }

    revalidatePath("/employees");
    revalidatePath(`/employees/${parsed.data.employeeId}`);
    revalidatePath("/field");
    return { success: true, message: "קישור חשבון ההתחברות הוסר." };
  } catch (e) {
    console.error("unlinkEmployeeAuthUserFromForm exception", e);
    return { success: false, message: getSafeClientErrorMessage() };
  }
}
