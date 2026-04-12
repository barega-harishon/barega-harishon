import Link from "next/link";
import { redirect } from "next/navigation";

import { listOpenCollectionBalances } from "@/actions/collections";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { isOfficeOrAdminRole } from "@/types/app-role";
import { formatCurrencyIl } from "@/utils/money";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const roles = await getCurrentAppRoles();
  if (!isOfficeOrAdminRole(roles)) {
    redirect("/dashboard");
  }

  const rows = await listOpenCollectionBalances();

  return (
    <main className="container-page py-8">
      <div className="page-intro mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">גבייה</h1>
        <p className="text-sm text-muted-foreground">
          פרויקטים עם יתרה לגבייה (סכום מוסכם פחות תשלומים ששולמו).
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>יתרות פתוחות</CardTitle>
              <CardDescription>ממוין לפי יתרה גבוהה יותר.</CardDescription>
            </div>
            {rows.length > 0 ? (
              <Button asChild variant="outline" size="sm">
                <a download href="/api/collections/export">
                  ייצוא CSV
                </a>
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין יתרות פתוחות כרגע.</p>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
              <table className="w-full min-w-[40rem] border-collapse text-start text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">לקוח</th>
                    <th className="px-3 py-2 font-medium">סטטוס</th>
                    <th className="px-3 py-2 font-medium">סכום מוסכם</th>
                    <th className="px-3 py-2 font-medium">שולם</th>
                    <th className="px-3 py-2 font-medium">יתרה</th>
                    <th className="px-3 py-2 font-medium">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr className="border-b border-border last:border-0" key={row.projectId}>
                      <td className="px-3 py-2 font-medium">{row.clientName}</td>
                      <td className="px-3 py-2">
                        <ProjectStatusBadge status={row.status} />
                      </td>
                      <td className="px-3 py-2 tabular-nums">{formatCurrencyIl(row.totalPrice)}</td>
                      <td className="px-3 py-2 tabular-nums">{formatCurrencyIl(row.paidSum)}</td>
                      <td className="px-3 py-2 font-medium tabular-nums">
                        {formatCurrencyIl(row.balance)}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          className="text-primary hover:underline"
                          href={`/projects/${row.projectId}`}
                        >
                          לפרויקט
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
