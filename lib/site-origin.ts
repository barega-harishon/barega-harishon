import "server-only";

import { headers } from "next/headers";

/**
 * מקור האתר לבניית קישורים מלאים (מיילים, קישור מעקב).
 * עדיפות ל־NEXT_PUBLIC_SITE_URL; אחרת כותרות הבקשה.
 */
export async function getPreferredSiteOrigin(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const rawProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "http";
  const proto = rawProto === "https" || rawProto === "http" ? rawProto : "http";
  return `${proto}://${host}`;
}
