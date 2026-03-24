"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createEquipmentPurchaseBatchFromForm } from "@/actions/equipment-batches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EquipmentBatchAvailabilityRow } from "@/types/equipment-batches";
import { formatCurrencyIl } from "@/utils/money";

interface EquipmentBatchesPanelProps {
  equipmentId: string;
  batches: EquipmentBatchAvailabilityRow[];
}

export function EquipmentBatchesPanel({ equipmentId, batches }: EquipmentBatchesPanelProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createEquipmentPurchaseBatchFromForm, null);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius)] border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">הוספת פעימת רכישה</h3>
        <form action={formAction} className="grid gap-3 sm:grid-cols-2">
          <input name="equipmentId" type="hidden" value={equipmentId} />
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">תאריך רכישה</label>
            <Input name="purchasedAt" required type="date" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">כמות</label>
            <Input min={1} name="quantity" required type="number" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">עלות יחידה</label>
            <Input min={0} name="unitCost" required step="0.01" type="number" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">ספק</label>
            <Input name="supplierName" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">מספר אסמכתא</label>
            <Input name="referenceNo" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">הערה</label>
            <Input name="note" />
          </div>
          {state && !state.success ? (
            <p className="text-sm text-destructive sm:col-span-2">{state.message}</p>
          ) : null}
          {state?.success ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400 sm:col-span-2">
              {state.message}
            </p>
          ) : null}
          <div className="flex justify-end sm:col-span-2">
            <Button disabled={isPending} type="submit">
              {isPending ? "שומרים…" : "הוספת אצווה"}
            </Button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
        <table className="w-full min-w-[56rem] border-collapse text-start text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-3 py-2 font-medium">תאריך רכישה</th>
              <th className="px-3 py-2 font-medium">ספק</th>
              <th className="px-3 py-2 font-medium">אסמכתא</th>
              <th className="px-3 py-2 font-medium">כמות</th>
              <th className="px-3 py-2 font-medium">נלקח</th>
              <th className="px-3 py-2 font-medium">נותר</th>
              <th className="px-3 py-2 font-medium">עלות יחידה</th>
              <th className="px-3 py-2 font-medium">הערה</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={8}>
                  אין עדיין אצוות רכישה לפריט זה.
                </td>
              </tr>
            ) : (
              batches.map((b) => (
                <tr className="border-b border-border last:border-0" key={b.id}>
                  <td className="px-3 py-2">{new Date(b.purchased_at).toLocaleDateString("he-IL")}</td>
                  <td className="px-3 py-2">{b.supplier_name ?? "—"}</td>
                  <td className="px-3 py-2">{b.reference_no ?? "—"}</td>
                  <td className="px-3 py-2">{b.quantity}</td>
                  <td className="px-3 py-2">{b.picked_qty}</td>
                  <td className="px-3 py-2 font-medium">{b.remaining_qty}</td>
                  <td className="px-3 py-2">{formatCurrencyIl(b.unit_cost)}</td>
                  <td className="max-w-[14rem] truncate px-3 py-2 text-muted-foreground">{b.note ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
