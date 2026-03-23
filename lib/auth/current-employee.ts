import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

/** מזהה רשומת `employees` למשתמש המחובר (אם קושרו `auth_user_id`). */
export async function getCurrentUserEmployeeId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data.id as string;
}
