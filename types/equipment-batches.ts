export interface EquipmentPurchaseBatchRow {
  id: string;
  equipment_id: string;
  purchased_at: string;
  quantity: number;
  unit_cost: string | number;
  supplier_name: string | null;
  reference_no: string | null;
  note: string | null;
  created_at: string;
}

export interface EquipmentBatchAvailabilityRow extends EquipmentPurchaseBatchRow {
  picked_qty: number;
  remaining_qty: number;
}

export interface EquipmentPickSelectionInput {
  batchId: string;
  quantity: number;
  checked: boolean;
}

export type EquipmentStockTxType = "pick" | "return" | "adjustment";
export type EquipmentAdjustmentDirection = "in" | "out";
