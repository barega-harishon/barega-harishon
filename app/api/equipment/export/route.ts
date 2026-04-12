import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOfficeOrAdminRole } from "@/types/app-role";
import { buildCsvRow } from "@/utils/csv";
import { getEquipmentAvailabilityMap } from "@/actions/project-equipment";

export const dynamic = "force-dynamic";

type ExportKind = "realtime" | "company";

function parseKind(raw: string | null): ExportKind {
  return raw === "company" ? "company" : "realtime";
}

export async function GET(request: Request) {
  const roles = await getCurrentAppRoles();
  if (!isOfficeOrAdminRole(roles) && !roles.includes("warehouse")) {
    return new Response("אין הרשאה לייצוא מלאי.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const url = new URL(request.url);
  const kind = parseKind(url.searchParams.get("kind"));
  const supabase = await createServerSupabaseClient();

  const { data: equipment } = await supabase
    .from("equipment")
    .select("id, name, category, total_qty, rent_price, warehouse_location, created_at")
    .order("name", { ascending: true });

  const rows = equipment ?? [];
  const day = new Date().toISOString().slice(0, 10);

  if (kind === "realtime") {
    const availability = await getEquipmentAvailabilityMap();
    const header = buildCsvRow([
      "מזהה פריט",
      "שם",
      "קטגוריה",
      "במחסן כעת",
      "משובץ פעיל",
      "פנוי בזמן אמת",
      "מחיר יחידה",
      "מיקום במחסן",
    ]);
    const lines = rows.map((r) => {
      const a = availability[String(r.id)] ?? { totalQty: Number(r.total_qty ?? 0), allocated: 0, available: 0 };
      return buildCsvRow([
        String(r.id),
        String(r.name ?? ""),
        String(r.category ?? ""),
        String(a.totalQty),
        String(a.allocated),
        String(a.available),
        String(r.rent_price ?? 0),
        String(r.warehouse_location ?? ""),
      ]);
    });
    return new Response(`\uFEFF${[header, ...lines].join("\n")}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="inventory-realtime-${day}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const { data: batches } = await supabase
    .from("equipment_purchase_batches")
    .select(
      "id, equipment_id, purchased_at, quantity, unit_cost, supplier_name, reference_no, note, created_at",
    )
    .order("purchased_at", { ascending: false });

  const byEquipment = new Map<string, Array<Record<string, unknown>>>();
  for (const b of batches ?? []) {
    const key = String(b.equipment_id);
    const current = byEquipment.get(key) ?? [];
    current.push(b as Record<string, unknown>);
    byEquipment.set(key, current);
  }

  const header = buildCsvRow([
    "מזהה פריט",
    "שם",
    "קטגוריה",
    "כמות כוללת",
    "מחיר יחידה",
    "מיקום במחסן",
    "תאריך יצירת פריט",
    "מזהה אצווה",
    "תאריך רכישה",
    "כמות באצווה",
    "עלות יחידה באצווה",
    "ספק",
    "אסמכתא",
    "הערת אצווה",
  ]);

  const lines: string[] = [];
  for (const r of rows) {
    const itemBatches = byEquipment.get(String(r.id)) ?? [];
    if (itemBatches.length === 0) {
      lines.push(
        buildCsvRow([
          String(r.id),
          String(r.name ?? ""),
          String(r.category ?? ""),
          String(r.total_qty ?? 0),
          String(r.rent_price ?? 0),
          String(r.warehouse_location ?? ""),
          String(r.created_at ?? ""),
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ]),
      );
      continue;
    }
    for (const b of itemBatches) {
      lines.push(
        buildCsvRow([
          String(r.id),
          String(r.name ?? ""),
          String(r.category ?? ""),
          String(r.total_qty ?? 0),
          String(r.rent_price ?? 0),
          String(r.warehouse_location ?? ""),
          String(r.created_at ?? ""),
          String(b.id ?? ""),
          String(b.purchased_at ?? ""),
          String(b.quantity ?? ""),
          String(b.unit_cost ?? ""),
          String(b.supplier_name ?? ""),
          String(b.reference_no ?? ""),
          String(b.note ?? ""),
        ]),
      );
    }
  }

  return new Response(`\uFEFF${[header, ...lines].join("\n")}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-company-${day}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
