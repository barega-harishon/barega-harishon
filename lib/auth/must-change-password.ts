import type { User } from "@supabase/supabase-js";

/** נקבע ב־user_metadata בעת יצירת משתמש ע״י אדמין — עד עדכון סיסמה ראשון. */
export function userMustChangePassword(user: User | null): boolean {
  if (!user?.user_metadata || typeof user.user_metadata !== "object") {
    return false;
  }
  const v = (user.user_metadata as Record<string, unknown>).must_change_password;
  return v === true || v === "true";
}
