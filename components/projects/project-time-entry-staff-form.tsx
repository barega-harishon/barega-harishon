"use client";

import { useActionState } from "react";

import { createTimeEntryFromForm } from "@/actions/time-entries";
import type { ActionResult } from "@/types/common";
import type { EmployeeOption } from "@/types/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProjectTimeEntryStaffFormProps {
  projectId: string;
  employeeOptions: EmployeeOption[];
}

export function ProjectTimeEntryStaffForm({
  projectId,
  employeeOptions,
}: ProjectTimeEntryStaffFormProps) {
  const [state, action, pending] = useActionState(
    createTimeEntryFromForm,
    null as ActionResult<{ id: string }> | null,
  );

  const today = new Date();
  const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <form action={action} className="space-y-3 border-t border-border pt-4">
      <input name="projectId" type="hidden" value={projectId} />
      <p className="text-sm font-medium">הוספת דיווח עבור עובד</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="te-employee">
            עובד
          </label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            id="te-employee"
            name="employeeId"
            required
          >
            <option value="">בחרו…</option>
            {employeeOptions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="te-date">
            תאריך
          </label>
          <Input defaultValue={defaultDate} id="te-date" name="workDate" required type="date" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="te-hours">
            שעות
          </label>
          <Input
            id="te-hours"
            max={24}
            min={0.25}
            name="hours"
            required
            step={0.25}
            type="number"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="te-note">
            הערה
          </label>
          <Input id="te-note" name="note" type="text" />
        </div>
      </div>
      {state && !state.success ? (
        <p className="text-xs text-destructive">{state.message}</p>
      ) : null}
      {state?.success ? <p className="text-xs text-green-700 dark:text-green-400">{state.message}</p> : null}
      <Button disabled={pending} size="sm" type="submit" variant="outline">
        {pending ? "שומרים…" : "שמירה"}
      </Button>
    </form>
  );
}
