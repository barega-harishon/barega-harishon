export interface TimeEntryRow {
  id: string;
  employee_id: string;
  project_id: string;
  work_date: string;
  hours: number;
  note: string | null;
  created_at: string;
  employees: { name: string } | null;
}

export interface TimeEntryProjectOption {
  id: string;
  label: string;
}
