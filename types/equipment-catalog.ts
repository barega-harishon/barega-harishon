export interface EquipmentRow {
  id: string;
  name: string;
  category: string;
  total_qty: number;
  rent_price: string | number;
  warehouse_location: string | null;
  created_at: string;
}

export interface EquipmentRowWithAvailability extends EquipmentRow {
  allocated: number;
  available: number;
}
