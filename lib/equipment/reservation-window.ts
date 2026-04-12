/** חלון זמן לשיבוץ ציוד (מילישניות) */
export type ReservationWindowMs = { startMs: number; endMs: number };

export type ProjectDateFields = {
  setup_starts_at: string | null;
  event_starts_at: string | null;
  event_ends_at: string | null;
  teardown_at: string | null;
};

/**
 * חלון לפי תוכנית: התחלה = הקמה אם קיימת אחרת אירוע; סיום = פירוק אם קיים אחרת סיום אירוע אחרת תחילת אירוע.
 * null אם חסרים נתונים או שהטווח לא תקין — מתנהגים בשמרנות (כמו "תופס תמיד" בחישובי חפיפה).
 */
export function reservationWindowFromProjectDates(
  row: ProjectDateFields,
): ReservationWindowMs | null {
  const startIso = row.setup_starts_at ?? row.event_starts_at;
  const endIso = row.teardown_at ?? row.event_ends_at ?? row.event_starts_at;
  if (!startIso?.trim() || !endIso?.trim()) {
    return null;
  }
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs > endMs) {
    return null;
  }
  return { startMs, endMs };
}

export function reservationWindowsOverlap(a: ReservationWindowMs, b: ReservationWindowMs): boolean {
  return a.startMs <= b.endMs && b.startMs <= a.endMs;
}

/** יום UTC של `now` (לדשבורד / זמינות כללית) */
export function utcCalendarDayWindowMs(now: Date = new Date()): ReservationWindowMs {
  const startMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const endMs = startMs + 86400000 - 1;
  return { startMs, endMs };
}
