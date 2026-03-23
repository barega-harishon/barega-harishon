/** שורה ברשימת לקוחות (עם סטטיסטיקה מהשרת) */
export interface ClientListRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  project_count: number;
}

export interface ClientDetailRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
}
