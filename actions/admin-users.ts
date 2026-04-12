"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentAppRole } from "@/lib/auth/current-profile";
import { getSafeClientErrorMessage } from "@/lib/errors";
import { hasServiceRoleKey, createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import { APP_ROLE_OPTIONS, parseAppRole, type AppRole } from "@/types/app-role";
import { normalizeEmail } from "@/utils/sanitize";

export type AdminUserListRow = {
  profileId: string;
  fullName: string;
  role: AppRole;
  createdAt: string;
  email: string | null;
};

async function loadAuthEmailsByUserId(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!hasServiceRoleKey()) {
    return map;
  }
  try {
    const admin = createServiceRoleSupabaseClient();
    let page = 1;
    const perPage = 200;
    const maxPages = 50;
    while (page <= maxPages) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error || !data?.users) {
        break;
      }
      for (const u of data.users) {
        const id = u.id;
        const email = typeof u.email === "string" && u.email.length > 0 ? u.email : null;
        if (id && email) {
          map.set(id, email);
        }
      }
      if (page >= (data.lastPage ?? page)) {
        break;
      }
      page += 1;
    }
  } catch (e) {
    console.error("loadAuthEmailsByUserId failed", e);
  }
  return map;
}

/** רשימת פרופילים לניהול תפקידים — רק אדמין. */
export async function listAdminUserRows(): Promise<{
  rows: AdminUserListRow[];
  loadError: string | null;
  emailsNote: string | null;
}> {
  const role = await getCurrentAppRole();
  if (role !== "admin") {
    return { rows: [], loadError: "אין הרשאה.", emailsNote: null };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("listAdminUserRows failed", error);
    return {
      rows: [],
      loadError: "לא ניתן לטעון את רשימת המשתמשים.",
      emailsNote: null,
    };
  }

  const emailsById = await loadAuthEmailsByUserId();
  const emailsNote = hasServiceRoleKey()
    ? null
    : "להצגת דוא״ל: הגדירו SUPABASE_SERVICE_ROLE_KEY בסביבת השרת (מפתח שרת בלבד).";

  const rows: AdminUserListRow[] = data.map((row) => {
    const id = row.id as string;
    const r = parseAppRole(String(row.role ?? ""));
    return {
      profileId: id,
      fullName: typeof row.full_name === "string" ? row.full_name : "",
      role: r ?? "field",
      createdAt: typeof row.created_at === "string" ? row.created_at : "",
      email: emailsById.get(id) ?? null,
    };
  });

  return { rows, loadError: null, emailsNote };
}

const updateRoleSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(APP_ROLE_OPTIONS),
});

export async function updateAdminProfileRoleFromForm(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null> | null> {
  const role = await getCurrentAppRole();
  if (role !== "admin") {
    return { success: false, message: "אין הרשאה לעדכון תפקידים." };
  }

  const parsed = updateRoleSchema.safeParse({
    profileId: formData.get("profileId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { success: false, message: "נתונים לא תקינים." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "נדרשת התחברות." };
  }

  if (user.id === parsed.data.profileId && parsed.data.role !== "admin") {
    return {
      success: false,
      message: "לא ניתן להסיר מעצמכם את תפקיד האדמין.",
    };
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ role: parsed.data.role })
      .eq("id", parsed.data.profileId);

    if (error) {
      console.error("updateAdminProfileRoleFromForm failed", error);
      return { success: false, message: getSafeClientErrorMessage() };
    }

    revalidatePath("/admin/users");
    return { success: true, message: "התפקיד עודכן." };
  } catch (e) {
    console.error("updateAdminProfileRoleFromForm exception", e);
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

const inviteSchema = z.object({
  email: z.string().email("כתובת דוא״ל אינה תקינה").transform(normalizeEmail),
  appRole: z.enum(APP_ROLE_OPTIONS),
});

/**
 * שולח הזמנה במייל (Auth) עם app_metadata.app_role — רק אדמין ורק כשמוגדר מפתח שרת.
 * לאחר קבלת החשבון, הטריגר handle_new_user ייצור profiles עם התפקיד שנבחר.
 */
export async function inviteUserWithRoleFromForm(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null> | null> {
  const role = await getCurrentAppRole();
  if (role !== "admin") {
    return { success: false, message: "אין הרשאה." };
  }
  if (!hasServiceRoleKey()) {
    return {
      success: false,
      message: "שליחת הזמנה דורשת הגדרת SUPABASE_SERVICE_ROLE_KEY בשרת.",
    };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    appRole: formData.get("appRole"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, message: first?.message ?? "נתונים לא תקינים." };
  }

  try {
    const admin = createServiceRoleSupabaseClient();
    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
      data: { full_name: "" },
    });
    if (error) {
      console.error("inviteUserByEmail failed", error);
      return { success: false, message: "שליחת ההזמנה נכשלה. ייתכן שהדוא״ל כבר רשום." };
    }

    const newUserId = invited?.user?.id;
    if (newUserId) {
      const { error: metaErr } = await admin.auth.admin.updateUserById(newUserId, {
        app_metadata: { app_role: parsed.data.appRole },
      });
      if (metaErr) {
        console.error("inviteUserWithRole update app_metadata failed", metaErr);
      }
      const { error: profileErr } = await admin
        .from("profiles")
        .update({ role: parsed.data.appRole })
        .eq("id", newUserId);
      if (profileErr) {
        console.error("inviteUserWithRole profiles update failed", profileErr);
      }
    }

    revalidatePath("/admin/users");
    return {
      success: true,
      message: newUserId
        ? "הזמנה נשלחה והוגדר תפקיד לחשבון. המשתמש יאשר במייל."
        : "הזמנה נשלחה. אם התפקיד לא הוגדר, עדכנו אותו מהטבלה.",
    };
  } catch (e) {
    console.error("inviteUserWithRoleFromForm exception", e);
    return { success: false, message: getSafeClientErrorMessage() };
  }
}
