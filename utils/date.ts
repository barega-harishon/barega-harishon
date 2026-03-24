import type { DateStylePreference } from "@/lib/date-style";

const HEBREW_ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"] as const;
const HEBREW_TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"] as const;
const HEBREW_HUNDREDS = ["", "ק", "ר", "ש", "ת"] as const;

function addGereshMarks(letters: string): string {
  if (!letters) {
    return "";
  }
  if (letters.length === 1) {
    return `${letters}׳`;
  }
  return `${letters.slice(0, -1)}״${letters.slice(-1)}`;
}

/** ממיר מספר לעברית באותיות (גימטריה), כולל גרש/גרשיים. */
function toHebrewNumberLetters(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  let n = Math.floor(value);
  let out = "";

  while (n >= 400) {
    out += "ת";
    n -= 400;
  }

  if (n >= 100) {
    const h = Math.floor(n / 100);
    out += HEBREW_HUNDREDS[h] ?? "";
    n %= 100;
  }

  // כללי כתיבה י״ה/י״ו במקום יה/יו.
  if (n === 15) {
    out += "טו";
    n = 0;
  } else if (n === 16) {
    out += "טז";
    n = 0;
  }

  if (n >= 10) {
    const t = Math.floor(n / 10);
    out += HEBREW_TENS[t] ?? "";
    n %= 10;
  }

  if (n > 0) {
    out += HEBREW_ONES[n] ?? "";
  }

  return addGereshMarks(out);
}

function formatHebrewYearNumber(year: number): string {
  // בכתיבה מודרנית מקובל לקצר את האלפים: תשפ״ו במקום ה׳תשפ״ו.
  if (year >= 5000 && year < 6000) {
    return toHebrewNumberLetters(year - 5000);
  }
  return toHebrewNumberLetters(year);
}

function parseAsciiNumber(text: string): number | null {
  const digits = text.replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }
  const num = Number.parseInt(digits, 10);
  return Number.isFinite(num) ? num : null;
}

/** Format ISO string for `<input type="datetime-local" />` (local). */
export function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}

/** מפתח YYYY-MM-DD לפי אזור זמן מקומי של השרת/דפדפן */
export function localDateKeyFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function localDateKeyFromParts(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function formatGregorianMonthYearHe(year: number, month: number): string {
  const dt = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(dt);
}

/** כותרת חודש עברי + שנה באותיות, לפי תאריך לועזי נתון. */
export function formatHebrewMonthYearWithLetters(year: number, month: number): string {
  const dt = new Date(year, month - 1, 1);
  const parts = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
    month: "long",
    year: "numeric",
  }).formatToParts(dt);

  let monthText = "";
  let yearText = "";
  for (const part of parts) {
    if (part.type === "month") {
      monthText = part.value;
    } else if (part.type === "year") {
      const num = parseAsciiNumber(part.value);
      yearText = num ? formatHebrewYearNumber(num) : part.value;
    }
  }

  const out = `${monthText} ${yearText}`.trim();
  return out || "—";
}

export function formatDateTimeHe(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

/** תאריך עברי (לוח עברי) עם כתיבה באותיות ככל שנתמך בדפדפן. */
export function formatHebrewDateWithLetters(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  const parts = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(d);

  const composed = parts
    .map((part) => {
      if (part.type === "day") {
        const num = parseAsciiNumber(part.value);
        return num ? toHebrewNumberLetters(num) : part.value;
      }
      if (part.type === "year") {
        const num = parseAsciiNumber(part.value);
        return num ? formatHebrewYearNumber(num) : part.value;
      }
      return part.value;
    })
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();

  return composed || "—";
}

/** תאריך עברי + שעה מקומית קצרה. */
export function formatHebrewDateTimeWithLetters(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  const datePart = formatHebrewDateWithLetters(iso);
  const timePart = new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return `${datePart} בשעה ${timePart}`;
}

export function formatDateTimeByPreference(
  iso: string | null,
  style: DateStylePreference,
): string {
  if (style === "short") {
    return formatDateTimeHe(iso);
  }
  return formatHebrewDateTimeWithLetters(iso);
}

/** תאריך עברי קצר לתצוגת יומן (יום + חודש), למשל: י״ד ניסן */
export function formatHebrewDayMonthShort(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  const parts = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
    day: "numeric",
    month: "long",
  }).formatToParts(d);

  let dayText = "";
  let monthText = "";
  for (const part of parts) {
    if (part.type === "day") {
      const num = parseAsciiNumber(part.value);
      dayText = num ? toHebrewNumberLetters(num) : part.value;
    } else if (part.type === "month") {
      monthText = part.value;
    }
  }

  const out = `${dayText} ${monthText}`.trim();
  return out || "—";
}

/** שעה קצרה מתאריך־שעה (ליומן) */
export function formatTimeShortHe(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
