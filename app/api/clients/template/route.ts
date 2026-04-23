import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { isOfficeOrAdminRole } from "@/types/app-role";
import { buildCsvRow } from "@/utils/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  const roles = await getCurrentAppRoles();
  if (!isOfficeOrAdminRole(roles)) {
    return new Response("אין הרשאה להורדת תבנית.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const header = buildCsvRow(["name", "phone", "email", "address", "national_id"]);
  const sample = buildCsvRow([
    "לקוח לדוגמה בע\"מ",
    "0501234567",
    "client@example.com",
    "רחוב הדוגמה 10, תל אביב",
    "512345678",
  ]);

  const csv = `\uFEFF${[header, sample].join("\n")}`;
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="clients-import-template.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
