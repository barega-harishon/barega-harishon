/** Matches public.payment_type in Postgres */
export type PaymentType = "deposit" | "balance" | "other";

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  deposit: "מקדמה",
  balance: "יתרה",
  other: "אחר",
};

export interface PaymentRow {
  id: string;
  project_id: string;
  amount: string | number;
  type: PaymentType;
  paid_at: string;
  note: string | null;
}
