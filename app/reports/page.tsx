import Link from "next/link";
import { ArrowRightCircle } from "lucide-react";

import { getBusinessReportsBundle } from "@/actions/reports";
import { HeaderInfoModal } from "@/components/common/header-info-modal";
import { selectorButtonClass } from "@/components/common/selector-button-styles";
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
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { isOfficeOrAdminRole } from "@/types/app-role";
import { formatCurrencyIl } from "@/utils/money";

export const dynamic = "force-dynamic";

function reportPath(year: number): string {
  return `/reports?year=${year}`;
}

export default async function BusinessReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;
  const rawYear = Number.parseInt(sp.year ?? "", 10);
  const year = Number.isFinite(rawYear) ? rawYear : new Date().getFullYear();

  const roles = await getCurrentAppRoles();
  const allowed = isOfficeOrAdminRole(roles);

  if (!allowed) {
    return (
      <main className="container-page py-10 lg:flex lg:flex-col lg:items-center lg:text-center">
        <h1 className="text-2xl font-semibold">דוחות עסקיים</h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground lg:mx-auto">
          הדוחות זמינים לתפקידי <strong className="text-foreground">משרד</strong> ו־
          <strong className="text-foreground">אדמין</strong> בלבד.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link className="inline-flex items-center gap-1.5" href="/dashboard">
            <ArrowRightCircle className="h-4 w-4" />
            חזרה לדשבורד
          </Link>
        </Button>
      </main>
    );
  }

  const data = await getBusinessReportsBundle(year);
  if (!data) {
    return null;
  }

  const prevYear = data.year - 1;
  const nextYear = data.year + 1;
  const nowY = new Date().getFullYear();

  return (
    <main className="container-page space-y-8 py-8">
      <div className="page-header-row flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">דוחות עסקיים</h1>
          <HeaderInfoModal label="הנחיות דוחות עסקיים">
            <p>סיכומי צינור, תשלומים ופרויקטים — לפי נתוני המערכת והרשאות גבייה.</p>
          </HeaderInfoModal>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className={selectorButtonClass(false)} variant="outline">
            <Link href={reportPath(prevYear)}>שנה קודמת</Link>
          </Button>
          <span className="text-sm font-semibold tabular-nums">{data.year}</span>
          <Button asChild size="sm" className={selectorButtonClass(false)} variant="outline">
            <Link href={reportPath(nextYear)}>שנה הבאה</Link>
          </Button>
          <Button asChild size="sm" className={selectorButtonClass(false)} variant="outline">
            <Link href={reportPath(nowY)}>השנה הנוכחית</Link>
          </Button>
          <Button asChild size="sm" variant="default">
            <a
              download
              href={`/api/reports/export?year=${data.year}&kind=full`}
            >
              ייצוא CSV
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          subtitle={`${data.kpis.activeProjectCount} פרויקטים`}
          title="צינור פעיל (לא סגור)"
          value={formatCurrencyIl(data.kpis.activePipelineValue)}
        />
        <KpiCard
          subtitle={`${data.kpis.closedProjectCount} פרויקטים`}
          title="נפח מוסכם (סגורים)"
          value={formatCurrencyIl(data.kpis.closedBookedValue)}
        />
        <KpiCard
          subtitle={`${data.receivables.openProjectCount} פרויקטים עם יתרה`}
          title="סך יתרות פתוחות"
          value={formatCurrencyIl(data.receivables.totalOpenBalance)}
        />
        <KpiCard
          subtitle={`שנה ${data.year}`}
          title="סך תשלומים שנתי"
          value={formatCurrencyIl(data.kpis.yearPaymentsTotal)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>צינור לפי סטטוס</CardTitle>
            <CardDescription>מספר פרויקטים וסכום מוסכם (`total_price`) בכל שלב.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border text-start text-muted-foreground">
                    <th className="py-2 font-medium">סטטוס</th>
                    <th className="py-2 font-medium">כמות</th>
                    <th className="py-2 font-medium">סכום מוסכם</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pipeline.map((row) => (
                    <tr className="border-b border-border/80" key={row.status}>
                      <td className="py-2">
                        <ProjectStatusBadge status={row.status} />
                      </td>
                      <td className="py-2 tabular-nums">{row.count}</td>
                      <td className="py-2 font-medium tabular-nums">
                        {formatCurrencyIl(row.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>תשלומים לפי חודש</CardTitle>
            <CardDescription>שנה {data.year} (לוח שנה).</CardDescription>
          </CardHeader>
          <CardContent>
            {data.paymentsByMonth.every((m) => m.total === 0) ? (
              <p className="text-sm text-muted-foreground">אין תשלומים בשנה זו.</p>
            ) : (
              <PaymentBars rows={data.paymentsByMonth} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>תשלומים לפי סוג</CardTitle>
            <CardDescription>סיכום בשנה {data.year}.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.paymentsByType.map((row) => (
                <li className="flex justify-between gap-4 border-b border-border/80 py-2 last:border-0" key={row.type}>
                  <span>{row.label}</span>
                  <span className="font-medium tabular-nums">{formatCurrencyIl(row.total)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>פרויקטים חדשים לפי חודש</CardTitle>
            <CardDescription>לפי `created_at` — כמות וסכום מוסכם ראשוני.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-sm">
                <thead>
                  <tr className="border-b border-border text-start text-muted-foreground">
                    <th className="py-2 font-medium">חודש</th>
                    <th className="py-2 font-medium">פרויקטים חדשים</th>
                    <th className="py-2 font-medium">סכום מוסכם</th>
                  </tr>
                </thead>
                <tbody>
                  {data.newProjectsByMonth.map((row) => (
                    <tr className="border-b border-border/80" key={row.yearMonth}>
                      <td className="py-2">{row.label}</td>
                      <td className="py-2 tabular-nums">{row.count}</td>
                      <td className="py-2 font-medium tabular-nums">
                        {formatCurrencyIl(row.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        לרשימת יתרות מפורטת וייצוא נוסף —{" "}
        <Link className="underline-offset-2 hover:underline" href="/collections">
          גבייה
        </Link>
        {" · "}
        <Link className="underline-offset-2 hover:underline" href="/dashboard">
          דשבורד
        </Link>
        .
      </p>
    </main>
  );
}

function KpiCard({
  title,
  subtitle,
  value,
}: {
  title: string;
  subtitle: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium leading-snug">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
