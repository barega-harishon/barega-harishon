import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/app-role";

export async function getCurrentAppRole(): Promise<AppRole | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data?.role) {
    return null;
  }

  return data.role as AppRole;
}
