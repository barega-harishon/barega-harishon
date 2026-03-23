import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SignedMediaRef } from "@/types/signed-media";

export async function createSignedUrls(
  bucket: string,
  paths: string[],
  expiresInSeconds = 3600,
): Promise<SignedMediaRef[]> {
  if (paths.length === 0) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const results: SignedMediaRef[] = [];

  for (const path of paths) {
    if (!path || path.includes("..")) {
      continue;
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (!error && data?.signedUrl) {
      results.push({ path, url: data.signedUrl });
    }
  }

  return results;
}
