export function formatCurrencyIl(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return "—";
  }
  const n = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(n)) {
    return "—";
  }
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(n);
}
