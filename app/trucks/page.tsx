import Link from "next/link";

import { listEmployeeOptionsForAssignments } from "@/actions/assignments";
import { mapTruckIdToActiveProject } from "@/actions/project-trucks";
import { listTrucks } from "@/actions/trucks";
import { NewTruckForm } from "@/components/trucks/new-truck-form";
import { Button } from "@/components/ui/button";
import { getCurrentAppRole } from "@/lib/auth/current-profile";
import { normalizeTruckStatusForForm, TRUCK_STATUS_LABELS } from "@/types/trucks";

export const dynamic = "force-dynamic";

export default async function TrucksPage() {
  const [rows, employeeOptions, role, activeByTruck] = await Promise.all([
    listTrucks(),
    listEmployeeOptionsForAssignments(),
    getCurrentAppRole(),
    mapTruckIdToActiveProject(),
  ]);

  const canManage =
    role === "admin" || role === "operations" || role === "warehouse";

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">משאיות</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ניהול ציוד הובלה. עריכה למנהל תפעול, מחסן ואדמין; משרד רואה בלבד.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/projects">חזרה לפרויקטים</Link>
        </Button>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {canManage ? (
          <NewTruckForm employeeOptions={employeeOptions} />
        ) : (
          <div className="rounded-[var(--radius)] border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            אין לך הרשאה להוסיף או לערוך משאיות (משרד: צפייה בלבד).
          </div>
        )}
        <div className="rounded-[var(--radius)] border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">שיוך לפרויקט</p>
          <p className="mt-2">
            שיבוץ לפרויקט פעיל מתבצע מדף הפרויקט (&quot;משאיות לפרויקט&quot;). בעמודה &quot;פרויקט פעיל&quot; רואים אם המשאית תפוסה.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין משאיות רשומות.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
          <table className="w-full min-w-[48rem] border-collapse text-start text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-medium">רישוי</th>
                <th className="px-4 py-3 font-medium">נהג</th>
                <th className="px-4 py-3 font-medium">סטטוס</th>
                <th className="px-4 py-3 font-medium">פרויקט פעיל</th>
                <th className="px-4 py-3 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const st = normalizeTruckStatusForForm(row.status);
                const active = activeByTruck[row.id];
                return (
                  <tr className="border-b border-border last:border-0" key={row.id}>
                    <td className="px-4 py-3 font-medium">{row.license_plate}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.driver?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">{TRUCK_STATUS_LABELS[st]}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {active ? (
                        <Link className="font-medium text-foreground underline" href={`/projects/${active.projectId}`}>
                          {active.label}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/trucks/${row.id}`}>
                          {canManage ? "עריכה" : "פרטים"}
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
