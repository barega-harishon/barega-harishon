export interface EquipmentOption {
  id: string;
  name: string;
  category: string;
  total_qty: number;
  warehouse_location?: string | null;
}

export interface EquipmentAvailability {
  totalQty: number;
  allocated: number;
  available: number;
}

export interface ProjectEquipmentLine {
  id: string;
  quantity: number;
  picked_qty: number;
  equipment_id: string;
  equipment: {
    id: string;
    name: string;
    category: string;
    total_qty: number;
    warehouse_location?: string | null;
  } | null;
}
