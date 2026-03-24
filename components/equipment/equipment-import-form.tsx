"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { importEquipmentFromCsvForm } from "@/actions/equipment-import";
import { Button } from "@/components/ui/button";

export function EquipmentImportForm() {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(importEquipmentFromCsvForm, null);

  useEffect(() => {
    if (state?.success) {
      ref.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold">ייבוא מלאי מאקסל (CSV)</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        אפשר להעלות קובץ CSV או XLSX לפי התבנית.
      </p>
      <form action={action} className="space-y-3" ref={ref}>
        <input
          accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          name="file"
          required
          type="file"
        />
        {state && !state.success ? <p className="text-sm text-destructive">{state.message}</p> : null}
        {state?.success ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p>
        ) : null}
        <Button disabled={pending} type="submit" variant="outline">
          {pending ? "מייבאים…" : "ייבוא קובץ"}
        </Button>
      </form>
    </div>
  );
}
