import { formatCurrencyIl } from "@/utils/money";

export type MonthlyBarRow = { yearMonth: string; label: string; total: number };

interface PaymentBarsProps {
  rows: MonthlyBarRow[];
}

export function PaymentBars({ rows }: PaymentBarsProps) {
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));

  return (
    <div className="space-y-4">
      <div className="flex h-48 items-end gap-1 border-b border-border pb-2 md:gap-2">
        {rows.map((row) => {
          const heightPct = (row.total / maxTotal) * 100;
          return (
            <div
              key={row.yearMonth}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={`${row.label}: ${formatCurrencyIl(row.total)}`}
            >
              <span className="max-w-full truncate text-xs text-muted-foreground">
                {formatCurrencyIl(row.total)}
              </span>
              <div
                className="w-full max-w-[2rem] rounded-t-md bg-primary/80 transition-all"
                style={{ height: `${Math.max(heightPct, row.total > 0 ? 4 : 0)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-between gap-1 text-[10px] text-muted-foreground md:text-xs">
        {rows.map((row) => (
          <span key={row.yearMonth} className="min-w-0 flex-1 truncate text-center">
            {row.label}
          </span>
        ))}
      </div>
    </div>
  );
}
