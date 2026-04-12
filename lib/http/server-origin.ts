/**
 * מקור בקשה ל־Auth redirectTo (ללא סלאש בסוף).
 * משמש קישורי איפוס סיסמה והזמנות — עדיף ש־NEXT_PUBLIC_SITE_URL יוגדר בפרודקשן.
 */
export function getOriginFromHeaders(headerList: Headers): string {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  if (!host) {
    const fallback = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    return fallback.replace(/\/$/, "");
  }
  return `${protocol}://${host}`.replace(/\/$/, "");
}
