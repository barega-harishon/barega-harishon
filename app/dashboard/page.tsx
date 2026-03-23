import Link from "next/link";

import {
  getDashboardLowStockEquipment,
  getDashboardMonthlyPayments,
  getDashboardStatusCounts,
  getDashboardUpcomingProjects,
} from "@/actions/dashboard";
import { PaymentBars } from "@/components/dashboard/payment-bars";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentAppRole } from "@/lib/auth/current-profile";
import { isOfficeOrAdminRole } from "@/types/app-role";
import { formatDateTimeHe } from "@/utils/date";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const role = await getCurrentAppRole();
  const showFinance = isOfficeOrAdminRole(role);

  const [statusRows, upcoming, lowStock, monthlyPayments] = await Promise.all([
    getDashboardStatusCounts(),
    getDashboardUpcomingProjects(),
    getDashboardLowStockEquipment(),
    showFinance ? getDashboardMonthlyPayments() : Promise.resolve([]),
  ]);

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">דשבורד</h1>
          <p className="text-sm text-muted-foreground">תמונת מצב מהירה לפי ההרשאות שלך.</p>
        </div>
        {showFinance ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/reports">דוחות עסקיים</Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>פרויקטים לפי סטטוס</CardTitle>
            <CardDescription>מספרים לפי רשומות שאתה רשאי לראות.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {statusRows.map((row) => (
                <div
                  key={row.status}
                  className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-muted/30 p-3"
                >
                  <ProjectStatusBadge status={row.status} />
                  <span className="text-2xl font-semibold tabular-nums">{row.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>אירועים ב־14 הימים הקרובים</CardTitle>
            <CardDescription>לפי תאריך תחילת אירוע.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין אירועים מתוכננים בטווח זה.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {upcoming.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link className="font-medium text-primary hover:underline" href={`/projects/${p.id}`}>
                        {p.client_name}
                      </Link>
                      <ProjectStatusBadge status={p.status} />
                    </div>
                    <span className="text-muted-foreground">{formatDateTimeHe(p.event_starts_at)}</span>
                    {p.location_address ? (
                      <span className="text-muted-foreground">{p.location_address}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>לחץ מלאי</CardTitle>
            <CardDescription>
              פריטים עם זמינות נמוכה (עד 2 יחידות או עד 10% מהמלאי).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין התראות מלאי כרגע.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lowStock.map((row) => (
                  <li
                    key={row.equipment_id}
                    className="flex justify-between gap-4 border-b border-border pb-2 last:border-0"
                  >
                    <Link
                      className="font-medium text-primary hover:underline"
                      href={`/equipment/${row.equipment_id}`}
                    >
                      {row.name}
                    </Link>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      זמין {row.available} / {row.total_qty} (משובץ {row.allocated})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {showFinance ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>תשלומים לפי חודש</CardTitle>
              <CardDescription>סכום ששולם (מקדמה, יתרה ואחר) ב־12 החודשים האחרונים.</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyPayments.every((m) => m.total === 0) ? (
                <p className="text-sm text-muted-foreground">אין תשלומים רשומים בתקופה זו.</p>
              ) : (
                <PaymentBars rows={monthlyPayments} />
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
