import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  mergePrimaryAndExtraRoles,
  parseAppRole,
  parseAppRoleArray,
  type AppRole,
} from "@/types/app-role";

export type CurrentProfileAuthRoles = {
  /** תפקיד ראשי (profiles.role) — מוצג בהזמנות Auth וכברירת מחדל */
  primaryRole: AppRole;
  /** איחוד תפקיד ראשי + extra_roles */
  roles: AppRole[];
};

export async function getCurrentProfileAuthRoles(): Promise<CurrentProfileAuthRoles | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role, extra_roles")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data?.role) {
    return null;
  }

  const primary = parseAppRole(String(data.role)) ?? "field";
  const extras = parseAppRoleArray(data.extra_roles);
  const roles = mergePrimaryAndExtraRoles(primary, extras);
  return { primaryRole: primary, roles };
}

/** תפקיד ראשי בלבד (לתצוגה / מטא־דאטה). */
export async function getCurrentAppRole(): Promise<AppRole | null> {
  const ctx = await getCurrentProfileAuthRoles();
  return ctx?.primaryRole ?? null;
}

/** כל התפקידים הפעילים (ראשי + נוספים) — לבדיקות הרשאה. */
export async function getCurrentAppRoles(): Promise<AppRole[]> {
  const ctx = await getCurrentProfileAuthRoles();
  return ctx?.roles ?? [];
}
