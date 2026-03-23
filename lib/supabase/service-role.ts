import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getClientEnv } from "@/lib/env";

/**
 * לקוח Supabase עם מפתח service role — רק בשרת, לפעולות שדורשות הרשאה מלאה
 * (למשל טופס ציבורי ללא התחברות). אין להעביר ללקוח.
 */
export function createServiceRoleSupabaseClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  const { NEXT_PUBLIC_SUPABASE_URL } = getClientEnv();
  return createClient(NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
