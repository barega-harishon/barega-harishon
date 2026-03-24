import Link from "next/link";

import { listEmployees } from "@/actions/employees";
import { NewEmployeeForm } from "@/components/employees/new-employee-form";
import { Button } from "@/components/ui/button";
import { getCurrentAppRole } from "@/lib/auth/current-profile";
import type { EmployeeType } from "@/types/employees";
import { EMPLOYEE_TYPE_LABELS } from "@/types/employees";
import { formatCurrencyIl } from "@/utils/money";

export const dynamic = "force-dynamic";

function isEmployeeType(v: string): v is EmployeeType {
  return v === "fixed" || v === "hourly" || v === "agency";
}

export default async function EmployeesPage() {
  const [rows, role] = await Promise.all([listEmployees(), getCurrentAppRole()]);
  const canManage =
    role === "admin" || role === "office" || role === "operations";

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">צוות</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            אנשי צוות ב-Supabase (טבלת <code className="rounded bg-muted px-1">employees</code>) — שיבוץ
            לפרויקטים, פרטי קשר, בנק ומסמכים. הוספה: משרד / תפעול / אדמין.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/projects">חזרה לפרויקטים</Link>
        </Button>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {canManage ? (
          <NewEmployeeForm />
        ) : (
          <div className="rounded-[var(--radius)] border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            אין לך הרשאה להוסיף עובדים. צפייה ברשימה בלבד.
          </div>
        )}
        <div className="rounded-[var(--radius)] border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">קישור לשיבוץ</p>
          <p className="mt-2">
            משבצים עובדים מתוך דף כל <Link className="text-primary underline" href="/projects">פרויקט</Link>.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין עדיין עובדים במערכת.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
          <table className="w-full min-w-[40rem] border-collapse text-start text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-medium">שם</th>
                <th className="px-4 py-3 font-medium">סוג</th>
                <th className="px-4 py-3 font-medium">טלפון</th>
                <th className="px-4 py-3 font-medium">תעריף שעתי</th>
                <th className="px-4 py-3 font-medium">הערת זמינות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const t = isEmployeeType(row.type) ? row.type : "hourly";
                return (
                  <tr className="border-b border-border last:border-0" key={row.id}>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{EMPLOYEE_TYPE_LABELS[t]}</td>
                    <td className="max-w-[10rem] truncate px-4 py-3 text-muted-foreground">
                      {row.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {t === "hourly" ? formatCurrencyIl(row.hourly_rate) : "—"}
                    </td>
                    <td className="max-w-[14rem] truncate px-4 py-3 text-muted-foreground">
                      {row.availability_note ?? "—"}
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
