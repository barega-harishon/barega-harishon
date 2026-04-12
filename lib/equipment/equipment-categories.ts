/**
 * קטגוריות מלאי קבועות (ערכי `equipment.category` ב־DB).
 * ניתן להרחיב רשימה + מיגרציה למיפוי ערכים ישנים.
 */
export const EQUIPMENT_PREDEFINED_CATEGORIES = [
  "כיסאות",
  "שולחנות",
  "במה",
  "אוהלים",
  "ציוד הגברה",
  "תאורה",
  "טקסטיל",
  "אביזרים",
  "אחר",
] as const;

export type EquipmentCategoryPreset = (typeof EQUIPMENT_PREDEFINED_CATEGORIES)[number];

const PRESET_SET = new Set<string>(EQUIPMENT_PREDEFINED_CATEGORIES);

export function isAllowedEquipmentCategory(value: string): boolean {
  const v = value.trim();
  if (v === "") {
    return true;
  }
  return PRESET_SET.has(v);
}

/** לסינון: כל הקבועות, ואחריהן ערכי DB שלא ברשימה (מורשת) */
export function mergeCategoryFilterOptions(dbCategories: string[]): string[] {
  const legacy = dbCategories.filter((c) => c.trim() !== "" && !PRESET_SET.has(c));
  const legacySorted = [...new Set(legacy)].sort((a, b) => a.localeCompare(b, "he"));
  return [...EQUIPMENT_PREDEFINED_CATEGORIES, ...legacySorted];
}

/** לייבוא: קטגוריה לא מוכרת → "אחר" */
export function normalizeImportedEquipmentCategory(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) {
    return "";
  }
  return PRESET_SET.has(t) ? t : "אחר";
}
