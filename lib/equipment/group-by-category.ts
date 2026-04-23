import { EQUIPMENT_PREDEFINED_CATEGORIES } from "@/lib/equipment/equipment-categories";

export const EQUIPMENT_UNCATEGORIZED_LABEL = "ללא קטגוריה";

export interface EquipmentCategoryGroup<T> {
  key: string;
  label: string;
  items: T[];
}

function normalizeCategoryLabel(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  return value === "" ? EQUIPMENT_UNCATEGORIZED_LABEL : value;
}

export function groupEquipmentByCategory<T>(
  items: T[],
  getCategory: (item: T) => string | null | undefined,
): EquipmentCategoryGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const label = normalizeCategoryLabel(getCategory(item));
    const arr = map.get(label) ?? [];
    arr.push(item);
    map.set(label, arr);
  }

  const predefined = EQUIPMENT_PREDEFINED_CATEGORIES.filter((cat) => map.has(cat));
  const predefinedSet = new Set<string>(predefined);
  const legacy = [...map.keys()]
    .filter((key) => key !== EQUIPMENT_UNCATEGORIZED_LABEL && !predefinedSet.has(key))
    .sort((a, b) => a.localeCompare(b, "he"));
  const orderedLabels = [
    ...predefined,
    ...legacy,
    ...(map.has(EQUIPMENT_UNCATEGORIZED_LABEL) ? [EQUIPMENT_UNCATEGORIZED_LABEL] : []),
  ];

  return orderedLabels.map((label) => ({
    key: label,
    label,
    items: map.get(label) ?? [],
  }));
}
