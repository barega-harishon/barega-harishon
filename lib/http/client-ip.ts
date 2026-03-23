import { headers } from "next/headers";

/** מזהה לקוח לצורך rate limit (IP או fallback). */
export async function getRequestClientIpKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = h.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }
  return "unknown";
}
