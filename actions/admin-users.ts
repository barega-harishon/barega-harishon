"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { isAuthApiError } from "@supabase/supabase-js";
import { z } from "zod";

import { clientMessageForAdminCreateUserFailure } from "@/lib/auth/admin-create-user-error-message";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { generateInitialPassword } from "@/lib/auth/generate-initial-password";
import { clientMessageForInviteUserFailure } from "@/lib/auth/invite-user-error-message";
import { getSafeClientErrorMessage } from "@/lib/errors";
import { getOriginFromHeaders } from "@/lib/http/server-origin";
import { hasServiceRoleKey, createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import { APP_ROLE_OPTIONS, parseAppRole, parseAppRoleArray, type AppRole } from "@/types/app-role";
import { normalizeEmail } from "@/utils/sanitize";

export type AdminUserListRow = {
  profileId: string;
  fullName: string;
  role: AppRole;
  extraRoles: AppRole[];
  createdAt: string;
  email: string | null;
};

type AuthEmailLoadResult = {
  map: Map<string, string>;
  /** נחתכה לולאת listUsers לפני סיום כל העמודים (מגבלת בטיחות). */
  listUsersTruncated: boolean;
};

async function loadAuthEmailsByProfileIds(profileIds: string[]): Promise<AuthEmailLoadResult> {
  const map = new Map<string, string>();
  if (!hasServiceRoleKey()) {
    return { map, listUsersTruncated: false };
  }
  let listUsersTruncated = false;
  try {
    const admin = createServiceRoleSupabaseClient();
    const perPage = 1000;
    const maxPages = 500;
    let page = 1;

    while (page <= maxPages) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error || !data?.users) {
        console.error("loadAuthEmailsByProfileIds listUsers failed", error);
        break;
      }
      for (const u of data.users) {
        const id = u.id;
        const email = typeof u.email === "string" && u.email.length > 0 ? u.email : null;
        if (id && email) {
          map.set(id, email);
        }
      }
      const lastPage = data.lastPage ?? page;
      if (page >= lastPage) {
        break;
      }
      page += 1;
      if (page > maxPages) {
        listUsersTruncated = true;
        break;
      }
    }

    const missing = profileIds.filter((id) => id.length > 0 && !map.has(id));
    for (const id of missing) {
      const { data, error } = await admin.auth.admin.getUserById(id);
      if (error) {
        console.error("loadAuthEmailsByProfileIds getUserById failed", id, error);
        continue;
      }
      const email = typeof data.user?.email === "string" && data.user.email.length > 0 ? data.user.email : null;
      if (email) {
        map.set(id, email);
      }
    }
  } catch (e) {
    console.error("loadAuthEmailsByProfileIds failed", e);
  }
  return { map, listUsersTruncated };
}

/** רשימת פרופילים לניהול תפקידים — רק אדמין. */
export async function listAdminUserRows(): Promise<{
  rows: AdminUserListRow[];
  loadError: string | null;
  emailsNote: string | null;
}> {
  const roles = await getCurrentAppRoles();
  if (!roles.includes("admin")) {
    return { rows: [], loadError: "אין הרשאה.", emailsNote: null };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, extra_roles, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("listAdminUserRows failed", error);
    return {
      rows: [],
      loadError: "לא ניתן לטעון את רשימת המשתמשים.",
      emailsNote: null,
    };
  }

  const profileIds = data.map((row) => String(row.id));
  const { map: emailsById, listUsersTruncated } = await loadAuthEmailsByProfileIds(profileIds);

  const noteParts: string[] = [];
  if (!hasServiceRoleKey()) {
    noteParts.push("להצגת דוא״ל: הגדירו SUPABASE_SERVICE_ROLE_KEY בסביבת השרת (מפתח שרת בלבד).");
  } else if (listUsersTruncated) {
    noteParts.push(
      "רשימת משתמשי Auth ארוכה מאוד; דוא״לים נטענו גם לפי מזהה. אם חסר דוא״ל, בדקו בלוח Supabase Auth.",
    );
  }

  const rows: AdminUserListRow[] = data.map((row) => {
    const id = row.id as string;
    const r = parseAppRole(String(row.role ?? ""));
    const extras = parseAppRoleArray((row as { extra_roles?: unknown }).extra_roles);
    return {
      profileId: id,
      fullName: typeof row.full_name === "string" ? row.full_name : "",
      role: r ?? "field",
      extraRoles: extras,
      createdAt: typeof row.created_at === "string" ? row.created_at : "",
      email: emailsById.get(id) ?? null,
    };
  });

  return { rows, loadError: null, emailsNote: noteParts.length > 0 ? noteParts.join(" ") : null };
}

function profileRowHasAdminAccess(role: AppRole, extras: AppRole[]): boolean {
  return role === "admin" || extras.includes("admin");
}

async function countProfilesWithAdminAccess(
  admin: ReturnType<typeof createServiceRoleSupabaseClient>,
): Promise<number> {
  const { data, error } = await admin.from("profiles").select("role, extra_roles");
  if (error || !data) {
    return 0;
  }
  let n = 0;
  for (const row of data) {
    const primary = parseAppRole(String(row.role ?? "")) ?? "field";
    const extras = parseAppRoleArray((row as { extra_roles?: unknown }).extra_roles);
    if (profileRowHasAdminAccess(primary, extras)) {
      n += 1;
    }
  }
  return n;
}

const deleteAuthUserSchema = z.object({
  profileId: z.string().uuid(),
});

/**
 * מוחק משתמש מ־Auth (ושורת profiles בגלל CASCADE) — חסימת גישה מלאה.
 * דורש מפתח שרת; לא ניתן למחוק את עצמכם או את האדמין האחרון.
 */
export async function deleteAuthUserFromAdminForm(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null> | null> {
  const actorRoles = await getCurrentAppRoles();
  if (!actorRoles.includes("admin")) {
    return { success: false, message: "אין הרשאה." };
  }
  if (!hasServiceRoleKey()) {
    return { success: false, message: "מחיקת משתמש דורשת הגדרת SUPABASE_SERVICE_ROLE_KEY בשרת." };
  }

  const parsed = deleteAuthUserSchema.safeParse({
    profileId: formData.get("profileId"),
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
  if (user.id === parsed.data.profileId) {
    return { success: false, message: "לא ניתן למחוק את החשבון שלכם מכאן." };
  }

  try {
    const admin = createServiceRoleSupabaseClient();
    const { data: targetProfile, error: loadErr } = await admin
      .from("profiles")
      .select("role, extra_roles")
      .eq("id", parsed.data.profileId)
      .maybeSingle();

    if (loadErr || !targetProfile) {
      console.error("deleteAuthUserFromAdminForm load profile", loadErr);
      return { success: false, message: getSafeClientErrorMessage() };
    }

    const primary = parseAppRole(String(targetProfile.role ?? "")) ?? "field";
    const extras = parseAppRoleArray((targetProfile as { extra_roles?: unknown }).extra_roles);
    if (profileRowHasAdminAccess(primary, extras)) {
      const adminCount = await countProfilesWithAdminAccess(admin);
      if (adminCount <= 1) {
        return { success: false, message: "לא ניתן למחוק את האדמין האחרון במערכת." };
      }
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(parsed.data.profileId);
    if (delErr) {
      console.error("deleteAuthUserFromAdminForm deleteUser failed", delErr);
      if (isAuthApiError(delErr) && delErr.code === "user_not_found") {
        return { success: false, message: "המשתמש לא נמצא ב־Auth (ייתכן שכבר נמחק)." };
      }
      return { success: false, message: getSafeClientErrorMessage() };
    }

    revalidatePath("/admin/users");
    return { success: true, message: "המשתמש הוסר וגישתו נחסמה." };
  } catch (e) {
    console.error("deleteAuthUserFromAdminForm exception", e);
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

const updateRoleSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(APP_ROLE_OPTIONS),
});

export async function updateAdminProfileRoleFromForm(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null> | null> {
  const actorRoles = await getCurrentAppRoles();
  if (!actorRoles.includes("admin")) {
    return { success: false, message: "אין הרשאה לעדכון תפקידים." };
  }

  const extraRaw = formData.getAll("extraRoles").map((v) => String(v));
  const extraParsed = extraRaw.map(parseAppRole).filter((x): x is AppRole => x !== null);

  const parsed = updateRoleSchema.safeParse({
    profileId: formData.get("profileId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { success: false, message: "נתונים לא תקינים." };
  }

  const primary = parsed.data.role;
  const extraRoles = [...new Set(extraParsed)].filter((r) => r !== primary);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "נדרשת התחברות." };
  }

  if (user.id === parsed.data.profileId) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("role, extra_roles")
      .eq("id", user.id)
      .maybeSingle();
    const prevPrimary = parseAppRole(String(existing?.role ?? "")) ?? "field";
    const prevExtras = parseAppRoleArray((existing as { extra_roles?: unknown } | null)?.extra_roles);
    const hadAdmin = prevPrimary === "admin" || prevExtras.includes("admin");
    const willAdmin = primary === "admin" || extraRoles.includes("admin");
    if (hadAdmin && !willAdmin) {
      return {
        success: false,
        message: "לא ניתן להסיר מעצמכם את תפקיד האדמין.",
      };
    }
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ role: primary, extra_roles: extraRoles })
      .eq("id", parsed.data.profileId);

    if (error) {
      console.error("updateAdminProfileRoleFromForm failed", error);
      return { success: false, message: getSafeClientErrorMessage() };
    }

    revalidatePath("/admin/users");
    return { success: true, message: "התפקידים עודכנו." };
  } catch (e) {
    console.error("updateAdminProfileRoleFromForm exception", e);
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

const inviteSchema = z.object({
  email: z.string().email("כתובת דוא״ל אינה תקינה").transform(normalizeEmail),
  appRole: z.enum(APP_ROLE_OPTIONS),
});

const createUserFormSchema = z
  .object({
    email: z.string().email("כתובת דוא״ל אינה תקינה").transform(normalizeEmail),
    appRole: z.enum(APP_ROLE_OPTIONS),
    passwordMode: z.enum(["auto", "manual"]),
    manualPassword: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.passwordMode === "manual") {
      const p = val.manualPassword ?? "";
      if (p.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "במצב סיסמה ידנית נדרשות לפחות 8 תווים.",
          path: ["manualPassword"],
        });
      }
    }
  });

export type AdminCreateUserSuccessData = {
  /** מוצג פעם אחת לאחר יצירה; null כשהוזנה סיסמה ידנית */
  initialPassword: string | null;
  email: string;
};

/**
 * יוצר משתמש ב־Auth (ללא מייל) עם סיסמה ראשונית וחובת החלפה בכניסה ראשונה.
 */
export async function createUserWithRoleFromForm(
  _prev: ActionResult<AdminCreateUserSuccessData> | null,
  formData: FormData,
): Promise<ActionResult<AdminCreateUserSuccessData> | null> {
  const actorRoles = await getCurrentAppRoles();
  if (!actorRoles.includes("admin")) {
    return { success: false, message: "אין הרשאה." };
  }
  if (!hasServiceRoleKey()) {
    return {
      success: false,
      message: "יצירת משתמש דורשת הגדרת SUPABASE_SERVICE_ROLE_KEY בשרת.",
    };
  }

  const passwordModeRaw = String(formData.get("passwordMode") ?? "auto");
  const parsed = createUserFormSchema.safeParse({
    email: formData.get("email"),
    appRole: formData.get("appRole"),
    passwordMode: passwordModeRaw === "manual" ? "manual" : "auto",
    manualPassword: String(formData.get("manualPassword") ?? ""),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, message: first?.message ?? "נתונים לא תקינים." };
  }

  const initialPassword =
    parsed.data.passwordMode === "auto" ? generateInitialPassword() : (parsed.data.manualPassword ?? "");

  try {
    const admin = createServiceRoleSupabaseClient();
    const { data: created, error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: initialPassword,
      email_confirm: true,
      user_metadata: {
        full_name: "",
        must_change_password: true,
      },
      app_metadata: { app_role: parsed.data.appRole },
    });

    if (error) {
      return { success: false, message: clientMessageForAdminCreateUserFailure(error) };
    }

    const newUserId = created?.user?.id;
    if (newUserId) {
      const { error: profileErr } = await admin
        .from("profiles")
        .update({ role: parsed.data.appRole, extra_roles: [] })
        .eq("id", newUserId);
      if (profileErr) {
        console.error("createUserWithRole profiles update failed", profileErr);
      }
    }

    revalidatePath("/admin/users");

    return {
      success: true,
      message:
        parsed.data.passwordMode === "auto"
          ? "המשתמש נוצר. העתיקו את הסיסמה החד־פעמית למטה והעבירו למשתמש בערוץ מאובטח. הוא יתבקש להחליף סיסמה בכניסה ראשונה."
          : "המשתמש נוצר. העבירו למשתמש את הסיסמה שהזנתם; הוא יתבקש להחליף סיסמה בכניסה ראשונה.",
      data: {
        initialPassword: parsed.data.passwordMode === "auto" ? initialPassword : null,
        email: parsed.data.email,
      },
    };
  } catch (e) {
    console.error("createUserWithRoleFromForm exception", e);
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

/**
 * שולח הזמנה במייל (Auth) עם app_metadata.app_role — רק אדמין ורק כשמוגדר מפתח שרת.
 * לאחר קבלת החשבון, הטריגר handle_new_user ייצור profiles עם התפקיד שנבחר.
 */
export async function inviteUserWithRoleFromForm(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null> | null> {
  const actorRoles = await getCurrentAppRoles();
  if (!actorRoles.includes("admin")) {
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
    const headerList = await headers();
    const origin = getOriginFromHeaders(headerList);
    const redirectTo = `${origin}/auth/callback`;

    const admin = createServiceRoleSupabaseClient();
    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
      data: { full_name: "" },
      redirectTo,
    });
    if (error) {
      return { success: false, message: clientMessageForInviteUserFailure(error) };
    }

    const newUserId = invited?.user?.id;
    let metaOk = true;
    let profileOk = true;
    if (newUserId) {
      const { error: metaErr } = await admin.auth.admin.updateUserById(newUserId, {
        app_metadata: { app_role: parsed.data.appRole },
      });
      if (metaErr) {
        metaOk = false;
        console.error("inviteUserWithRole update app_metadata failed", metaErr);
      }
      const { error: profileErr } = await admin
        .from("profiles")
        .update({ role: parsed.data.appRole, extra_roles: [] })
        .eq("id", newUserId);
      if (profileErr) {
        profileOk = false;
        console.error("inviteUserWithRole profiles update failed", profileErr);
      }
    }

    revalidatePath("/admin/users");

    const roleWarning =
      newUserId && (!metaOk || !profileOk)
        ? " התפקיד לא עודכן במלואו — בדקו בלוח Supabase ובטבלה ועדכנו ידנית במידת הצורך."
        : "";

    return {
      success: true,
      message: newUserId
        ? `הזמנה נשלחה והוגדר תפקיד לחשבון. המוזמן ילחץ על הקישור במייל (מומלץ בחלון גלישה פרטית או אחרי התנתקות).${roleWarning}`
        : `הזמנה נשלחה. אם התפקיד לא הוגדר, עדכנו אותו מהטבלה.${roleWarning}`,
    };
  } catch (e) {
    console.error("inviteUserWithRoleFromForm exception", e);
    return { success: false, message: getSafeClientErrorMessage() };
  }
}
