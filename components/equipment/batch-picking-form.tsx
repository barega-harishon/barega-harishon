"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createEquipmentPickTransactions } from "@/actions/equipment-batches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EquipmentBatchAvailabilityRow } from "@/types/equipment-batches";
import { formatCurrencyIl } from "@/utils/money";

interface BatchPickingFormProps {
  equipmentId: string;
  source: "project" | "warehouse";
  projectId?: string;
  title: string;
  batches: EquipmentBatchAvailabilityRow[];
  maxTotalQty?: number;
}

export function BatchPickingForm({
  equipmentId,
  source,
  projectId,
  title,
  batches,
  maxTotalQty,
}: BatchPickingFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [qty, setQty] = useState<Record<string, number>>({});

  const selectedTotal = useMemo(
    () =>
      batches.reduce((sum, b) => {
        if (!selected[b.id]) {
          return sum;
        }
        return sum + Math.max(0, Math.trunc(qty[b.id] ?? 0));
      }, 0),
    [batches, selected, qty],
  );

  function toggleBatch(batchId: string, checked: boolean, remaining: number) {
    setSelected((prev) => ({ ...prev, [batchId]: checked }));
    if (checked && !qty[batchId]) {
      setQty((prev) => ({ ...prev, [batchId]: Math.min(1, remaining) }));
    }
  }

  function setBatchQty(batchId: string, value: number) {
    setQty((prev) => ({ ...prev, [batchId]: Number.isFinite(value) ? value : 0 }));
  }

  function onSubmit() {
    setError(null);
    setSuccess(null);

    const selections = batches.map((b) => ({
      batchId: b.id,
      checked: Boolean(selected[b.id]),
      quantity: Math.max(0, Math.trunc(qty[b.id] ?? 0)),
    }));

    if (!selections.some((s) => s.checked && s.quantity > 0)) {
      setError("נא לסמן לפחות אצווה אחת ולמלא כמות תקינה.");
      return;
    }
    if (typeof maxTotalQty === "number" && selectedTotal > maxTotalQty) {
      setError("כמות הליקוט חורגת מהיתרה המותרת.");
      return;
    }

    startTransition(async () => {
      const result = await createEquipmentPickTransactions({
        equipmentId,
        source,
        projectId,
        selections,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setSuccess(result.message);
      setSelected({});
      setQty({});
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-[var(--radius)] border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-xs text-muted-foreground">
          נבחר: {selectedTotal}
          {typeof maxTotalQty === "number" ? ` / עד ${maxTotalQty}` : ""}
        </span>
      </div>

      {batches.length === 0 ? (
        <p className="text-xs text-muted-foreground">אין אצוות זמינות לליקוט.</p>
      ) : (
        <div className="space-y-2">
          {batches.map((b) => (
            <div
              key={b.id}
              className="grid grid-cols-1 gap-2 rounded-md border border-border/70 bg-card p-2 sm:grid-cols-[1fr_auto_auto]"
            >
              <label className="flex items-start gap-2 text-sm">
                <input
                  checked={Boolean(selected[b.id])}
                  onChange={(e) => toggleBatch(b.id, e.target.checked, b.remaining_qty)}
                  type="checkbox"
                />
                <span className="space-y-0.5">
                  <span className="block font-medium">
                    תאריך רכישה: {new Date(b.purchased_at).toLocaleDateString("he-IL")}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    ספק: {b.supplier_name ?? "—"} | אסמכתא: {b.reference_no ?? "—"} | עלות:{" "}
                    {formatCurrencyIl(b.unit_cost)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    באצווה: {b.quantity} | נלקח: {b.picked_qty} | נותר: {b.remaining_qty}
                  </span>
                </span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">כמות</span>
                <Input
                  className="w-24"
                  disabled={!selected[b.id]}
                  min={1}
                  onChange={(e) => setBatchQty(b.id, Number(e.target.value))}
                  type="number"
                  value={qty[b.id] ?? ""}
                />
              </div>
              <div className="flex items-center justify-end text-xs text-muted-foreground">
                מקסימום {b.remaining_qty}
              </div>
            </div>
          ))}
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p> : null}
      <div className="flex justify-end">
        <Button disabled={pending || batches.length === 0} onClick={onSubmit} type="button">
          {pending ? "שומרים…" : "אישור ליקוט"}
        </Button>
      </div>
    </div>
  );
}
