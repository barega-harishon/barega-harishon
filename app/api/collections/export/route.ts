import { listOpenCollectionBalances } from "@/actions/collections";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { isOfficeOrAdminRole } from "@/types/app-role";
import { PROJECT_STATUS_LABELS } from "@/types/projects";
import { buildCsvRow } from "@/utils/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  const roles = await getCurrentAppRoles();
  if (!isOfficeOrAdminRole(roles)) {
    return new Response("אין הרשאה לייצוא.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const rows = await listOpenCollectionBalances();

  const header = buildCsvRow([
    "לקוח",
    "סטטוס",
    "סכום מוסכם",
    "שולם",
    "יתרה",
    "מזהה פרויקט",
  ]);

  const lines = rows.map((r) =>
    buildCsvRow([
      r.clientName,
      PROJECT_STATUS_LABELS[r.status],
      r.totalPrice.toFixed(2),
      r.paidSum.toFixed(2),
      r.balance.toFixed(2),
      r.projectId,
    ]),
  );

  const csv = `\uFEFF${[header, ...lines].join("\n")}`;
  const day = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gabaya-${day}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
