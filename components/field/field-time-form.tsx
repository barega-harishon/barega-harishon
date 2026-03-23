"use client";

import { useActionState } from "react";

import { createTimeEntryFromForm } from "@/actions/time-entries";
import type { ActionResult } from "@/types/common";
import type { TimeEntryProjectOption } from "@/types/time-entries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface FieldTimeFormProps {
  projectOptions: TimeEntryProjectOption[];
  /** בחירת פרויקט ברירת מחדל (למשל מ־`/field/time?project=`) */
  defaultProjectId?: string | null;
}

export function FieldTimeForm({ projectOptions, defaultProjectId }: FieldTimeFormProps) {
  const [state, action, pending] = useActionState(
    createTimeEntryFromForm,
    null as ActionResult<{ id: string }> | null,
  );

  if (projectOptions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        אין פרויקטים משובצים — לא ניתן לדווח שעות עד שתישבצו לאירוע.
      </p>
    );
  }

  const today = new Date();
  const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const ids = new Set(projectOptions.map((o) => o.id));
  const selectedProjectId =
    defaultProjectId && ids.has(defaultProjectId) ? defaultProjectId : projectOptions[0]?.id;

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="projectId">
          פרויקט
        </label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={selectedProjectId}
          id="projectId"
          key={selectedProjectId}
          name="projectId"
          required
        >
          {projectOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="workDate">
            תאריך עבודה
          </label>
          <Input defaultValue={defaultDate} id="workDate" name="workDate" required type="date" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="hours">
            שעות
          </label>
          <Input
            id="hours"
            max={24}
            min={0.25}
            name="hours"
            required
            step={0.25}
            type="number"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="note">
          הערה (אופציונלי)
        </label>
        <Textarea id="note" name="note" rows={2} />
      </div>

      {state && !state.success ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-green-700 dark:text-green-400" role="status">
          {state.message}
        </p>
      ) : null}

      <Button className="w-full sm:w-auto" disabled={pending} size="lg" type="submit">
        {pending ? "שומרים…" : "שמירת דיווח"}
      </Button>
    </form>
  );
}
