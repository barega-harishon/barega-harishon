import { NextRequest } from "next/server";

import {
  queryBusinessKpis,
  queryNewProjectsByMonthForYear,
  queryPaymentsByMonthForYear,
  queryPaymentsByTypeForYear,
  queryPipelineByStatus,
  queryReceivablesKpi,
} from "@/lib/reports/business-queries";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { isOfficeOrAdminRole } from "@/types/app-role";
import { PROJECT_STATUS_LABELS } from "@/types/projects";
import { buildCsvRow } from "@/utils/csv";

export const dynamic = "force-dynamic";

function clampYear(y: number): number {
  if (!Number.isFinite(y)) {
    return new Date().getFullYear();
  }
  const n = Math.floor(y);
  return Math.min(2100, Math.max(2000, n));
}

export async function GET(request: NextRequest) {
  const roles = await getCurrentAppRoles();
  if (!isOfficeOrAdminRole(roles)) {
    return new Response("אין הרשאה לייצוא דוחות.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const { searchParams } = request.nextUrl;
  const year = clampYear(Number.parseInt(searchParams.get("year") ?? "", 10));
  const kind = searchParams.get("kind") ?? "full";

  if (kind !== "full") {
    return new Response("סוג ייצוא לא נתמך.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const [pipeline, paymentsByMonth, paymentsByType, newByMonth, kpis, receivables] =
    await Promise.all([
      queryPipelineByStatus(),
      queryPaymentsByMonthForYear(year),
      queryPaymentsByTypeForYear(year),
      queryNewProjectsByMonthForYear(year),
      queryBusinessKpis(year),
      queryReceivablesKpi(),
    ]);

  const lines: string[] = [];

  lines.push(buildCsvRow(["דוח עסקי", String(year)]));
  lines.push("");
  lines.push(buildCsvRow(["מדד", "ערך"]));
  lines.push(
    buildCsvRow(["צינור פעיל (סכום מוסכם)", kpis.activePipelineValue.toFixed(2)]),
  );
  lines.push(
    buildCsvRow(["מספר פרויקטים פעילים", String(kpis.activeProjectCount)]),
  );
  lines.push(
    buildCsvRow(["נפח מוסכם פרויקטים סגורים", kpis.closedBookedValue.toFixed(2)]),
  );
  lines.push(
    buildCsvRow(["מספר פרויקטים סגורים", String(kpis.closedProjectCount)]),
  );
  lines.push(buildCsvRow(["סך יתרות פתוחות", receivables.totalOpenBalance.toFixed(2)]));
  lines.push(
    buildCsvRow(["מספר פרויקטים עם יתרה", String(receivables.openProjectCount)]),
  );
  lines.push(buildCsvRow(["סך תשלומים בשנה", kpis.yearPaymentsTotal.toFixed(2)]));
  lines.push("");
  lines.push(buildCsvRow(["צינור לפי סטטוס"]));
  lines.push(buildCsvRow(["סטטוס", "כמות", "סכום מוסכם"]));
  for (const row of pipeline) {
    lines.push(
      buildCsvRow([
        PROJECT_STATUS_LABELS[row.status],
        String(row.count),
        row.totalPrice.toFixed(2),
      ]),
    );
  }
  lines.push("");
  lines.push(buildCsvRow(["תשלומים לפי חודש בשנה"]));
  lines.push(buildCsvRow(["חודש", "סכום"]));
  for (const row of paymentsByMonth) {
    lines.push(buildCsvRow([row.label, row.total.toFixed(2)]));
  }
  lines.push("");
  lines.push(buildCsvRow(["תשלומים לפי סוג בשנה"]));
  lines.push(buildCsvRow(["סוג", "סכום"]));
  for (const row of paymentsByType) {
    lines.push(buildCsvRow([row.label, row.total.toFixed(2)]));
  }
  lines.push("");
  lines.push(buildCsvRow(["פרויקטים חדשים לפי חודש"]));
  lines.push(buildCsvRow(["חודש", "כמות", "סכום מוסכם"]));
  for (const row of newByMonth) {
    lines.push(
      buildCsvRow([row.label, String(row.count), row.totalPrice.toFixed(2)]),
    );
  }

  const csv = `\uFEFF${lines.join("\n")}`;
  const filename = `dohot-askiyim-${year}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
