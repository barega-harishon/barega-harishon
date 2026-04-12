import { buildCsvRow } from "@/utils/csv";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { isOfficeOrAdminRole } from "@/types/app-role";

export const dynamic = "force-dynamic";

export async function GET() {
  const roles = await getCurrentAppRoles();
  if (!isOfficeOrAdminRole(roles) && !roles.includes("warehouse")) {
    return new Response("אין הרשאה להורדת תבנית.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const header = buildCsvRow([
    "name",
    "category",
    "total_qty",
    "rent_price",
    "warehouse_location",
    "purchased_at",
    "purchase_quantity",
    "unit_cost",
    "supplier_name",
    "reference_no",
    "note",
  ]);

  const sample = buildCsvRow([
    "פלטת במה 2x1",
    "במה",
    "40",
    "120.00",
    "מדף A-3",
    "2026-03-01",
    "20",
    "85.00",
    "ספק לדוגמה",
    "INV-10045",
    "רכישה ראשונה",
  ]);

  const csv = `\uFEFF${[header, sample].join("\n")}`;
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="equipment-import-template.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
