"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { addProjectTruckFromForm, removeProjectTruck } from "@/actions/project-trucks";
import type { ActionResult } from "@/types/common";
import type { ProjectTruckLine, TruckOptionForProject } from "@/types/project-trucks";
import { normalizeTruckStatusForForm, TRUCK_STATUS_LABELS } from "@/types/trucks";
import { Button } from "@/components/ui/button";

const selectClassName =
  "flex h-10 w-full rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface ProjectTrucksSectionProps {
  projectId: string;
  lines: ProjectTruckLine[];
  options: TruckOptionForProject[];
  canManage: boolean;
}

export function ProjectTrucksSection({
  projectId,
  lines,
  options,
  canManage,
}: ProjectTrucksSectionProps) {
  const router = useRouter();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [addState, addAction, addPending] = useActionState(
    addProjectTruckFromForm,
    null as ActionResult<Record<string, never>> | null,
  );

  useEffect(() => {
    if (addState?.success) {
      router.refresh();
    }
  }, [addState, router]);

  function handleRemove(truckId: string) {
    startTransition(async () => {
      setRemoveError(null);
      const result = await removeProjectTruck({ projectId, truckId });
      if (result.success) {
        router.refresh();
      } else {
        setRemoveError(result.message);
      }
    });
  }

  const selectable = options.filter((o) => !o.blockedReason);
  const hasAnyOption = options.length > 0;

  return (
    <div className="space-y-6">
      {removeError ? (
        <p className="text-sm text-destructive" role="alert">
          {removeError}
        </p>
      ) : null}
      {addState && !addState.success ? (
        <p className="text-sm text-destructive" role="alert">
          {addState.message}
        </p>
      ) : null}
      {addState?.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{addState.message}</p>
      ) : null}

      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין משאיות משובצות לפרויקט.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
          <table className="w-full min-w-[32rem] border-collapse text-start text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">רישוי</th>
                <th className="px-3 py-2 font-medium">נהג</th>
                <th className="px-3 py-2 font-medium">סטטוס משאית</th>
                {canManage ? <th className="px-3 py-2 font-medium">פעולות</th> : null}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const t = line.truck;
                const plate = t?.license_plate ?? "—";
                const driver = t?.driver?.name ?? "—";
                const st = t ? normalizeTruckStatusForForm(t.status) : "available";
                return (
                  <tr className="border-b border-border last:border-0" key={line.truck_id}>
                    <td className="px-3 py-2 font-medium">{plate}</td>
                    <td className="px-3 py-2 text-muted-foreground">{driver}</td>
                    <td className="px-3 py-2">{TRUCK_STATUS_LABELS[st]}</td>
                    {canManage ? (
                      <td className="px-3 py-2">
                        <Button
                          disabled={pending}
                          onClick={() => handleRemove(line.truck_id)}
                          size="sm"
                          type="button"
                          variant="outline"
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

      <p className="text-xs text-muted-foreground">
        סטטוס המשאית במערכת (&quot;זמין&quot; / &quot;בשימוש&quot;) מתעדכן אוטומטית לפי שיבוץ לפרויקטים
        שאינם סגורים. סטטוס &quot;תחזוקה&quot; לא משתנה אוטומטית.
      </p>

      {canManage ? (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">שיבוץ משאית</h3>
          {!hasAnyOption ? (
            <p className="text-sm text-muted-foreground">
              אין משאיות זמינות להוספה (כולן כבר בפרויקט זה או אין משאיות במערכת).
            </p>
          ) : (
            <form action={addAction} className="flex flex-wrap items-end gap-3">
              <input name="projectId" type="hidden" value={projectId} />
              <div className="min-w-[14rem] flex-1 space-y-1.5">
                <label className="text-sm font-medium" htmlFor={`truckPick-${projectId}`}>
                  בחירת משאית
                </label>
                <select
                  className={selectClassName}
                  id={`truckPick-${projectId}`}
                  name="truckId"
                  required
                >
                  <option value="">בחרו…</option>
                  {options.map((o) => (
                    <option disabled={Boolean(o.blockedReason)} key={o.id} value={o.id}>
                      {o.license_plate}
                      {o.blockedReason ? " (תפוסה בפרויקט אחר)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <Button disabled={addPending || selectable.length === 0} type="submit">
                {addPending ? "משבצים…" : "הוספת משאית"}
              </Button>
            </form>
          )}
          {selectable.length === 0 && hasAnyOption ? (
            <p className="text-sm text-muted-foreground">
              כל המשאיות שלא בפרויקט זה כבר משובצות לפרויקטים פעילים אחרים.
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        ניהול צי המשאיות:{" "}
        <Link className="underline hover:text-foreground" href="/trucks">
          /trucks
        </Link>
      </p>
    </div>
  );
}
