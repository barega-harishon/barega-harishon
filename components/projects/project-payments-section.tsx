"use client";

import { useActionState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { recordPaymentFromForm } from "@/actions/payments";
import type { ActionResult } from "@/types/common";
import type { PaymentRow, PaymentType } from "@/types/payments";
import { PAYMENT_TYPE_LABELS } from "@/types/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyIl } from "@/utils/money";

const selectClassName =
  "flex h-10 w-full rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface ProjectPaymentsSectionProps {
  projectId: string;
  payments: PaymentRow[];
  totalPrice: string | number | null;
}

function sumPaid(payments: PaymentRow[]): number {
  return payments.reduce((acc, p) => acc + Number(p.amount), 0);
}

function defaultPaidAtLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ProjectPaymentsSection({
  projectId,
  payments,
  totalPrice,
}: ProjectPaymentsSectionProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    recordPaymentFromForm,
    null as ActionResult<{ id: string }> | null,
  );

  const total = useMemo(() => {
    const n = Number(totalPrice);
    return Number.isNaN(n) ? 0 : n;
  }, [totalPrice]);

  const paid = useMemo(() => sumPaid(payments), [payments]);
  const balance = total - paid;

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-[var(--radius)] border border-border bg-muted/30 p-3 text-sm sm:grid-cols-3">
        <div>
          <span className="text-muted-foreground">סכום מוסכם</span>
          <p className="font-semibold tabular-nums">{formatCurrencyIl(total)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">שולם</span>
          <p className="font-semibold tabular-nums">{formatCurrencyIl(paid)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">יתרה לגבייה</span>
          <p className="font-semibold tabular-nums">{formatCurrencyIl(balance)}</p>
        </div>
      </div>

      {total <= 0 ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          מומלץ לעדכן את &quot;סכום כולל&quot; בכרטיס הפרטים כדי לעקוב אחרי יתרות.
        </p>
      ) : null}

      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין תשלומים רשומים לפרויקט זה.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
          <table className="w-full min-w-[32rem] border-collapse text-start text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">תאריך</th>
                <th className="px-3 py-2 font-medium">סוג</th>
                <th className="px-3 py-2 font-medium">סכום</th>
                <th className="px-3 py-2 font-medium">הערה</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const type = p.type as PaymentType;
                const label = PAYMENT_TYPE_LABELS[type] ?? p.type;
                const d = new Date(p.paid_at);
                const when = Number.isNaN(d.getTime())
                  ? p.paid_at
                  : new Intl.DateTimeFormat("he-IL", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(d);
                return (
                  <tr className="border-b border-border last:border-0" key={p.id}>
                    <td className="px-3 py-2">{when}</td>
                    <td className="px-3 py-2">{label}</td>
                    <td className="px-3 py-2 tabular-nums">{formatCurrencyIl(p.amount)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.note ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <form action={action} className="space-y-4 rounded-[var(--radius)] border border-border bg-muted/20 p-4">
        <input name="projectId" type="hidden" value={projectId} />
        <h3 className="text-sm font-semibold">רישום תשלום</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="amount">
              סכום
            </label>
            <Input id="amount" min={0.01} name="amount" required step="0.01" type="number" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="type">
              סוג
            </label>
            <select className={selectClassName} defaultValue="deposit" id="type" name="type" required>
              {(Object.keys(PAYMENT_TYPE_LABELS) as PaymentType[]).map((key) => (
                <option key={key} value={key}>
                  {PAYMENT_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="paidAt">
              מועד תשלום
            </label>
            <Input
              defaultValue={defaultPaidAtLocal()}
              id="paidAt"
              name="paidAt"
              required
              type="datetime-local"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="note">
              הערה (אופציונלי)
            </label>
            <Input id="note" maxLength={500} name="note" type="text" />
          </div>
        </div>
        {state && !state.success ? (
          <p className="text-sm text-destructive" role="alert">
            {state.message}
          </p>
        ) : null}
        {state?.success ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p>
        ) : null}
        <div className="flex justify-end">
          <Button disabled={pending} type="submit">
            {pending ? "שומרים…" : "שמירת תשלום"}
          </Button>
        </div>
      </form>
    </div>
  );
}
