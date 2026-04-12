/** ערכי סטטוס נפוצים ל־`trucks.status` (טקסט חופשי ב-DB) */
export const TRUCK_STATUS_VALUES = ["available", "in_use", "maintenance"] as const;

export type TruckStatusValue = (typeof TRUCK_STATUS_VALUES)[number];

export const TRUCK_STATUS_LABELS: Record<TruckStatusValue, string> = {
  available: "זמין",
  in_use: "בשימוש",
  maintenance: "תחזוקה",
};

export interface TruckRow {
  id: string;
  license_plate: string;
  /** שם תצוגה; אם ריק — מציגים רישוי */
  display_name: string;
  notes: string | null;
  driver_id: string | null;
  status: string;
  created_at: string;
  driver: { id: string; name: string } | null;
}

/** תווית קצרה לרשימות ובחירה — שם או רישוי */
export function truckDisplayLabel(truck: Pick<TruckRow, "display_name" | "license_plate">): string {
  const n = truck.display_name?.trim();
  return n && n.length > 0 ? n : truck.license_plate;
}

/** אם ב־DB ערך ישן — ברירת מחדל לטופס */
export function normalizeTruckStatusForForm(status: string): TruckStatusValue {
  if (TRUCK_STATUS_VALUES.includes(status as TruckStatusValue)) {
    return status as TruckStatusValue;
  }
  return "available";
}
