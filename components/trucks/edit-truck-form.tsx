"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { updateTruckFromForm } from "@/actions/trucks";
import type { ActionResult } from "@/types/common";
import type { EmployeeOption } from "@/types/employees";
import type { TruckRow, TruckStatusValue } from "@/types/trucks";
import {
  normalizeTruckStatusForForm,
  TRUCK_STATUS_LABELS,
  TRUCK_STATUS_VALUES,
} from "@/types/trucks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const selectClassName =
  "flex h-10 w-full rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface EditTruckFormProps {
  truck: TruckRow;
  employeeOptions: EmployeeOption[];
}

export function EditTruckForm({ truck, employeeOptions }: EditTruckFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    updateTruckFromForm,
    null as ActionResult<{ id: string }> | null,
  );

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  const statusValue = normalizeTruckStatusForForm(truck.status);

  return (
    <form action={action} className="space-y-4">
      <input name="id" type="hidden" value={truck.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="displayName">
            שם תצוגה (אופציונלי)
          </label>
          <Input
            defaultValue={truck.display_name ?? ""}
            id="displayName"
            name="displayName"
            placeholder="למשל משאית צוות א׳"
            type="text"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="licensePlate">
            מספר רישוי
          </label>
          <Input
            defaultValue={truck.license_plate}
            id="licensePlate"
            name="licensePlate"
            required
            type="text"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="notes">
            הערות פנימיות
          </label>
          <Textarea
            defaultValue={truck.notes ?? ""}
            id="notes"
            name="notes"
            placeholder="תחזוקה, מגבלות, הערות למשרד…"
            rows={3}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="driverId">
            נהג
          </label>
          <select
            className={selectClassName}
            defaultValue={truck.driver_id ?? ""}
            id="driverId"
            name="driverId"
          >
            <option value="">ללא נהג משובץ</option>
            {employeeOptions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="status">
            סטטוס
          </label>
          <select
            className={selectClassName}
            defaultValue={statusValue}
            id="status"
            name="status"
            required
          >
            {(TRUCK_STATUS_VALUES as readonly TruckStatusValue[]).map((s) => (
              <option key={s} value={s}>
                {TRUCK_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            &quot;בשימוש&quot; ו־&quot;זמין&quot; מסתנכרנים עם שיבוץ לפרויקט (מדף הפרויקט). &quot;תחזוקה&quot;
            נשאר ידני ולא יוחלף אוטומטית.
          </p>
        </div>
      </div>
      {state && !state.success ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p>
      ) : null}
      <div className="flex justify-end">
        <Button disabled={pending} type="submit">
          {pending ? "שומרים…" : "עדכון משאית"}
        </Button>
      </div>
    </form>
  );
}
