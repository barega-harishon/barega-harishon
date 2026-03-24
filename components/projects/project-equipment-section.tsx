"use client";

import { Fragment, useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  removeProjectEquipmentLine,
  upsertProjectEquipmentLineFromForm,
} from "@/actions/project-equipment";
import { BatchPickingForm } from "@/components/equipment/batch-picking-form";
import type {
  EquipmentAvailability,
  EquipmentOption,
  ProjectEquipmentLine,
} from "@/types/project-equipment";
import type { EquipmentBatchAvailabilityRow } from "@/types/equipment-batches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const selectClassName =
  "flex h-10 w-full rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface ProjectEquipmentLineView extends ProjectEquipmentLine {
  headroom: number;
}

interface ProjectEquipmentSectionProps {
  projectId: string;
  lines: ProjectEquipmentLineView[];
  options: EquipmentOption[];
  availability: Record<string, EquipmentAvailability>;
  batchAvailabilityByEquipment: Record<string, EquipmentBatchAvailabilityRow[]>;
}

export function ProjectEquipmentSection({
  projectId,
  lines,
  options,
  availability,
  batchAvailabilityByEquipment,
}: ProjectEquipmentSectionProps) {
  const router = useRouter();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [lineState, lineAction, linePending] = useActionState(
    upsertProjectEquipmentLineFromForm,
    null,
  );

  useEffect(() => {
    if (lineState?.success) {
      router.refresh();
    }
  }, [lineState, router]);

  function handleRemove(lineId: string) {
    startTransition(async () => {
      setRemoveError(null);
      const result = await removeProjectEquipmentLine({ lineId });
      if (result.success) {
        router.refresh();
      } else {
        setRemoveError(result.message);
      }
    });
  }

  return (
    <div className="space-y-6">
      {removeError ? (
        <p className="text-sm text-destructive" role="alert">
          {removeError}
        </p>
      ) : null}
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין עדיין ציוד משובץ לפרויקט.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
          <table className="w-full min-w-[36rem] border-collapse text-start text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">פריט</th>
                <th className="px-3 py-2 font-medium">כמות</th>
                <th className="px-3 py-2 font-medium">מקסימום לשורה</th>
                <th className="px-3 py-2 font-medium">נלקט</th>
                <th className="px-3 py-2 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const name = line.equipment?.name ?? "—";
                const headroom = line.headroom;
                const remainingNeed = Math.max(0, line.quantity - line.picked_qty);
                const equipmentId = line.equipment_id;
                const batches = batchAvailabilityByEquipment[equipmentId] ?? [];

                return (
                  <Fragment key={line.id}>
                    <tr className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">{name}</td>
                      <td className="px-3 py-2">{line.quantity}</td>
                      <td className="px-3 py-2 text-muted-foreground">{headroom}</td>
                      <td className="px-3 py-2 text-muted-foreground">{line.picked_qty}</td>
                      <td className="px-3 py-2">
                        <Button
                          disabled={pending}
                          onClick={() => handleRemove(line.id)}
                          size="sm"
                          type="button"
                          variant="destructive"
                        >
                          הסרה
                        </Button>
                      </td>
                    </tr>
                    <tr className="border-b border-border bg-muted/10 last:border-0">
                      <td className="px-3 py-3" colSpan={5}>
                        <BatchPickingForm
                          batches={batches}
                          equipmentId={equipmentId}
                          maxTotalQty={remainingNeed}
                          projectId={projectId}
                          source="project"
                          title={`ליקוט מהמחסן לפריט: ${name}`}
                        />
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <form action={lineAction} className="space-y-4 rounded-[var(--radius)] border border-border bg-muted/20 p-4">
        <input name="projectId" type="hidden" value={projectId} />
        <h3 className="text-sm font-semibold">הוספת / עדכון ציוד</h3>
        <p className="text-xs text-muted-foreground">
          אם הפריט כבר קיים בפרויקט, הכמות תתעדכן. נבדק מול מלאי ופרויקטים שאינם סגורים.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="equipmentId">
              פריט ציוד
            </label>
            <select
              required
              className={selectClassName}
              defaultValue=""
              id="equipmentId"
              name="equipmentId"
            >
              <option disabled value="">
                בחרו פריט
              </option>
              {options.map((opt) => {
                const snap = availability[opt.id];
                return (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                    {snap
                      ? ` — במלאי ${snap.totalQty}, פנוי במערכת ${snap.available}`
                      : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="quantity">
              כמות
            </label>
            <Input defaultValue={1} id="quantity" min={1} name="quantity" required type="number" />
          </div>
        </div>
        {lineState && !lineState.success ? (
          <p className="text-sm text-destructive">{lineState.message}</p>
        ) : null}
        {lineState?.success ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">{lineState.message}</p>
        ) : null}
        <div className="flex justify-end">
          <Button disabled={linePending} type="submit">
            {linePending ? "שומרים…" : "שמירת ציוד"}
          </Button>
        </div>
      </form>

      {options.length === 0 ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          אין פריטי ציוד בטבלת <code className="rounded bg-muted px-1">equipment</code>. הוסיפו
          פריטים ב־Supabase כדי לשבץ ציוד.
        </p>
      ) : null}
    </div>
  );
}
