"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  addProjectAssignmentFromForm,
  removeProjectAssignment,
} from "@/actions/assignments";
import type { ActionResult } from "@/types/common";
import type { AssignmentRole, ProjectAssignmentLine } from "@/types/assignments";
import { ASSIGNMENT_ROLE_LABELS } from "@/types/assignments";
import type { EmployeeOption } from "@/types/employees";
import { Button } from "@/components/ui/button";

const selectClassName =
  "flex h-10 w-full rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const ROLES: AssignmentRole[] = ["team_lead", "driver", "worker"];

interface ProjectAssignmentsSectionProps {
  projectId: string;
  assignments: ProjectAssignmentLine[];
  employeeOptions: EmployeeOption[];
  canAdd: boolean;
  canRemove: boolean;
}

export function ProjectAssignmentsSection({
  projectId,
  assignments,
  employeeOptions,
  canAdd,
  canRemove,
}: ProjectAssignmentsSectionProps) {
  const router = useRouter();
  const [addState, addAction, addPending] = useActionState(
    addProjectAssignmentFromForm,
    null as ActionResult<{ id: string }> | null,
  );
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [pendingRemove, startRemove] = useTransition();

  useEffect(() => {
    if (addState?.success) {
      router.refresh();
    }
  }, [addState, router]);

  function handleRemove(assignmentId: string) {
    if (!window.confirm("להסיר שיבוץ זה מהפרויקט?")) {
      return;
    }
    setRemoveError(null);
    startRemove(async () => {
      const result = await removeProjectAssignment({ assignmentId });
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

      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין עובדים משובצים לפרויקט זה.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
          <table className="w-full min-w-[28rem] border-collapse text-start text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">שם</th>
                <th className="px-3 py-2 font-medium">תפקיד בשטח</th>
                {canRemove ? <th className="px-3 py-2 font-medium">פעולות</th> : null}
              </tr>
            </thead>
            <tbody>
              {assignments.map((row) => {
                const role = row.role as AssignmentRole;
                const label = ASSIGNMENT_ROLE_LABELS[role] ?? row.role;
                const name = row.employees?.name ?? "—";
                return (
                  <tr className="border-b border-border last:border-0" key={row.id}>
                    <td className="px-3 py-2 font-medium">{name}</td>
                    <td className="px-3 py-2">{label}</td>
                    {canRemove ? (
                      <td className="px-3 py-2">
                        <Button
                          disabled={pendingRemove}
                          onClick={() => handleRemove(row.id)}
                          size="sm"
                          type="button"
                          variant="destructive"
                        >
                          הסרה
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canAdd ? (
        <form action={addAction} className="space-y-4 rounded-[var(--radius)] border border-border bg-muted/20 p-4">
          <input name="projectId" type="hidden" value={projectId} />
          <h3 className="text-sm font-semibold">שיבוץ עובד</h3>
          {employeeOptions.length === 0 ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              אין רשומות בטבלת העובדים.{" "}
              <a className="font-medium underline" href="/employees">
                הוסיפו עובדים
              </a>{" "}
              ואז חזרו לשבץ כאן.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="employeeId">
                  עובד
                </label>
                <select
                  required
                  className={selectClassName}
                  defaultValue=""
                  id="employeeId"
                  name="employeeId"
                >
                  <option disabled value="">
                    בחרו עובד
                  </option>
                  {employeeOptions.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="role">
                  תפקיד
                </label>
                <select className={selectClassName} defaultValue="worker" id="role" name="role" required>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ASSIGNMENT_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {addState && !addState.success ? (
            <p className="text-sm text-destructive">{addState.message}</p>
          ) : null}
          {addState?.success ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{addState.message}</p>
          ) : null}
          {employeeOptions.length > 0 ? (
            <div className="flex justify-end">
              <Button disabled={addPending} type="submit">
                {addPending ? "שומרים…" : "שמירת שיבוץ"}
              </Button>
            </div>
          ) : null}
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">שיבוץ ועריכה זמינים למשרד, תפעול ומנהל בלבד.</p>
      )}

      {canAdd && !canRemove ? (
        <p className="text-xs text-muted-foreground">
          הסרת שיבוץ דורשת הרשאת מנהל מערכת (מדיניות RLS).
        </p>
      ) : null}
    </div>
  );
}
