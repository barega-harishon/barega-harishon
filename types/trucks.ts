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
  driver_id: string | null;
  status: string;
  created_at: string;
  driver: { id: string; name: string } | null;
}

/** אם ב־DB ערך ישן — ברירת מחדל לטופס */
export function normalizeTruckStatusForForm(status: string): TruckStatusValue {
  if (TRUCK_STATUS_VALUES.includes(status as TruckStatusValue)) {
    return status as TruckStatusValue;
  }
  return "available";
}
