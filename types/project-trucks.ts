import type { TruckRow } from "@/types/trucks";

/** שורה ב־`project_trucks` עם פרטי משאית */
export interface ProjectTruckLine {
  project_id: string;
  truck_id: string;
  created_at: string;
  truck: Pick<TruckRow, "id" | "license_plate" | "status" | "driver_id"> & {
    driver: { id: string; name: string } | null;
  } | null;
}

export interface TruckOptionForProject {
  id: string;
  license_plate: string;
  /** אם מוגדר — לא ניתן לשבץ לפרויקט זה (משובץ לפרויקט פעיל אחר) */
  blockedReason: string | null;
}
