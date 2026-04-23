export interface InventoryCountRow {
  id: string;
  note: string | null;
  status: "draft" | "posted";
  created_at: string;
  posted_at: string | null;
}

export interface InventoryCountLineRow {
  id: string;
  count_id: string;
  equipment_id: string;
  expected_qty: number;
  counted_qty: number;
  delta_qty: number;
  equipment_name?: string;
  equipment_category?: string;
}
