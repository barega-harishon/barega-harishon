import Link from "next/link";

import { listEmployeesWithHealth } from "@/actions/employees";
import { selectorButtonClass } from "@/components/common/selector-button-styles";
import {
  type EmployeeFileLink,
  EmployeeFilesCell,
} from "@/components/employees/employee-files-cell";
import { NewEmployeeForm } from "@/components/employees/new-employee-form";
import { Button } from "@/components/ui/button";
import { getCurrentAppRole } from "@/lib/auth/current-profile";
import { EMPLOYEE_FILES_BUCKET } from "@/lib/storage/buckets";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { EmployeeType } from "@/types/employees";
import { EMPLOYEE_TYPE_LABELS } from "@/types/employees";
import { formatCurrencyIl } from "@/utils/money";

export const dynamic = "force-dynamic";

function isEmployeeType(v: string): v is EmployeeType {
  return v === "fixed" || v === "hourly" || v === "agency";
}

function displayFileNameFromPath(path: string): string {
  const fileWithStamp = path.split("/").pop() ?? path;
  const firstUnderscore = fileWithStamp.indexOf("_");
  if (firstUnderscore <= 0) {
    return fileWithStamp;
  }
  return fileWithStamp.slice(firstUnderscore + 1);
}

export default async function EmployeesPage() {
  const [{ rows, loadError }, role] = await Promise.all([
    listEmployeesWithHealth(),
    getCurrentAppRole(),
  ]);
  const canManage =
    role === "admin" || role === "office" || role === "operations";
  const canSeeFiles = canManage;

  let fileLinksByEmployee = new Map<string, { documents: EmployeeFileLink[]; licenses: EmployeeFileLink[] }>();
  if (canSeeFiles && rows.length > 0) {
    const supabase = await createServerSupabaseClient();
    const entries = await Promise.all(
      rows.map(async (row) => {
        const toLinks = async (paths: string[] | null | undefined): Promise<EmployeeFileLink[]> => {
          if (!Array.isArray(paths) || paths.length === 0) {
            return [];
          }

          const visible = paths.slice(0, 12);
          const links = await Promise.all(
            visible.map(async (path) => {
              const { data } = await supabase.storage
                .from(EMPLOYEE_FILES_BUCKET)
                .createSignedUrl(path, 60 * 60);
              if (!data?.signedUrl) {
                return null;
              }
              return {
                path,
                name: displayFileNameFromPath(path),
                url: data.signedUrl,
              } satisfies EmployeeFileLink;
            }),
          );

          return links.filter((v): v is EmployeeFileLink => v !== null);
        };

        const documents = await toLinks(row.documents_paths);
        const licenses = await toLinks(row.licenses_paths);
        return [row.id, { documents, licenses }] as const;
      }),
    );
    fileLinksByEmployee = new Map(entries);
  }

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
        <Button asChild className={selectorButtonClass(false)} variant="outline">
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

      {loadError ? (
        <div className="mb-4 rounded-[var(--radius)] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {loadError}
        </div>
      ) : null}

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
                <th className="px-4 py-3 font-medium">קבצים</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const t = isEmployeeType(row.type) ? row.type : "hourly";
                return (
                  <tr className="border-b border-border transition-colors hover:bg-muted/30 last:border-0" key={row.id}>
                    <td className="px-4 py-3 font-medium">
                      <Link className="hover:underline" href={`/employees/${row.id}`}>
                        {row.name}
                      </Link>
                    </td>
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
                    <td className="min-w-[16rem] px-4 py-3 align-top">
                      {canSeeFiles ? (
                        <EmployeeFilesCell
                          employeeId={row.id}
                          documents={fileLinksByEmployee.get(row.id)?.documents ?? []}
                          licenses={fileLinksByEmployee.get(row.id)?.licenses ?? []}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
