"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createTruckFromForm } from "@/actions/trucks";
import type { ActionResult } from "@/types/common";
import type { EmployeeOption } from "@/types/employees";
import { TRUCK_STATUS_LABELS, TRUCK_STATUS_VALUES } from "@/types/trucks";
import type { TruckStatusValue } from "@/types/trucks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const selectClassName =
  "flex h-10 w-full rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface NewTruckFormProps {
  employeeOptions: EmployeeOption[];
}

export function NewTruckForm({ employeeOptions }: NewTruckFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createTruckFromForm,
    null as ActionResult<{ id: string }> | null,
  );

  useEffect(() => {
    if (state?.success && state.data?.id) {
      router.push(`/trucks/${state.data.id}`);
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-4 rounded-[var(--radius)] border border-border bg-muted/20 p-4">
      <h2 className="text-sm font-semibold">משאית חדשה</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="licensePlate">
            מספר רישוי
          </label>
          <Input id="licensePlate" name="licensePlate" required type="text" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="driverId">
            נהג (אופציונלי)
          </label>
          <select className={selectClassName} defaultValue="" id="driverId" name="driverId">
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
          <select className={selectClassName} defaultValue="available" id="status" name="status" required>
            {(TRUCK_STATUS_VALUES as readonly TruckStatusValue[]).map((s) => (
              <option key={s} value={s}>
                {TRUCK_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {state && !state.success ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <div className="flex justify-end">
        <Button disabled={pending} type="submit">
          {pending ? "שומרים…" : "הוספת משאית"}
        </Button>
      </div>
    </form>
  );
}
