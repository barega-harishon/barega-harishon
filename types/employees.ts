/** Matches public.employee_type in Postgres */
export type EmployeeType = "fixed" | "hourly" | "agency";

export const EMPLOYEE_TYPE_LABELS: Record<EmployeeType, string> = {
  fixed: "קבוע",
  hourly: "לפי שעה",
  agency: "קבלן / סוכנות",
};

export interface EmployeeRow {
  id: string;
  name: string;
  type: EmployeeType;
  hourly_rate: string | number | null;
  availability_note: string | null;
  created_at: string;
}

export interface EmployeeOption {
  id: string;
  name: string;
}
