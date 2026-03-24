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
  phone: string | null;
  email: string | null;
  national_id: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  documents_notes: string | null;
  licenses_notes: string | null;
  documents_paths: string[] | null;
  licenses_paths: string[] | null;
}

export interface EmployeeOption {
  id: string;
  name: string;
}
