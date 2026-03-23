"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createEmployeeFromForm } from "@/actions/employees";
import type { ActionResult } from "@/types/common";
import { EMPLOYEE_TYPE_LABELS, type EmployeeType } from "@/types/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const selectClassName =
  "flex h-10 w-full rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const TYPES: EmployeeType[] = ["fixed", "hourly", "agency"];

export function NewEmployeeForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createEmployeeFromForm,
    null as ActionResult<{ id: string }> | null,
  );

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-4 rounded-[var(--radius)] border border-border bg-muted/20 p-4">
      <h2 className="text-sm font-semibold">עובד חדש</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="emp-name">
            שם מלא
          </label>
          <Input id="emp-name" name="name" required type="text" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="emp-type">
            סוג העסקה
          </label>
          <select className={selectClassName} defaultValue="hourly" id="emp-type" name="type" required>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {EMPLOYEE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="emp-rate">
            תעריף שעתי (₪, לפי שעה בלבד)
          </label>
          <Input id="emp-rate" min={0} name="hourlyRate" step="0.01" type="number" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="emp-note">
            הערת זמינות
          </label>
          <Input id="emp-note" maxLength={500} name="availabilityNote" type="text" />
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
          {pending ? "שומרים…" : "הוספת עובד"}
        </Button>
      </div>
    </form>
  );
}
