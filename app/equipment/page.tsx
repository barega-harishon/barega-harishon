import Link from "next/link";

import {
  listEquipmentCategoryOptions,
  listEquipmentRowsWithAvailability,
} from "@/actions/equipment-catalog";
import { selectorButtonClass } from "@/components/common/selector-button-styles";
import { EquipmentCategoryFilter } from "@/components/equipment/equipment-category-filter";
import { EquipmentImportForm } from "@/components/equipment/equipment-import-form";
import { NewEquipmentForm } from "@/components/equipment/new-equipment-form";
import { Button } from "@/components/ui/button";
import { formatCurrencyIl } from "@/utils/money";

export const dynamic = "force-dynamic";

function parseCategoryParam(raw: string | string[] | undefined): string | null {
  if (raw === undefined) {
    return null;
  }
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value.trim() === "") {
    return null;
  }
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string | string[] }>;
}) {
  const sp = await searchParams;
  const activeCat = parseCategoryParam(sp.cat);

  const [{ categories, hasUncategorized }, rows] = await Promise.all([
    listEquipmentCategoryOptions(),
    listEquipmentRowsWithAvailability(activeCat),
  ]);

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">מלאי ציוד</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            קטלוג פריטים להשכרה. <strong>במחסן</strong> – כמות במערכת; <strong>משובץ</strong> – בפרויקטים
            שאינם סגורים; <strong>פנוי</strong> – זמין לשיבוץ.
          </p>
        </div>
        <Button asChild className={selectorButtonClass(false)} variant="outline">
          <Link href="/projects">חזרה לפרויקטים</Link>
        </Button>
        <Button asChild className={selectorButtonClass(false)} variant="outline">
          <Link href="/equipment/picking">ליקוט מחסן</Link>
        </Button>
        <Button asChild className={selectorButtonClass(false)} variant="outline">
          <Link href="/api/equipment/export?kind=realtime">אקסל מלאי בזמן אמת</Link>
        </Button>
        <Button asChild className={selectorButtonClass(false)} variant="outline">
          <Link href="/api/equipment/export?kind=company">אקסל ציוד חברה (מלא)</Link>
        </Button>
        <Button asChild className={selectorButtonClass(false)} variant="outline">
          <Link href="/api/equipment/template">תבנית אקסל לייבוא</Link>
        </Button>
      </div>

      <EquipmentCategoryFilter
        activeCat={activeCat}
        categories={categories}
        hasUncategorized={hasUncategorized}
      />

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <NewEquipmentForm />
        <EquipmentImportForm />
        <div className="rounded-[var(--radius)] border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">הנחיות קצרות</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>עדכון כמות כאן משפיע על זמינות בשיבוץ לפרויקטים.</li>
            <li>מחיקת פריט דורשת הרשאת מנהל (RLS) ואינה אפשרית אם הפריט מקושר לפרויקט.</li>
            <li>משרד / תפעול יכולים להוסיף ולערוך פריטים (לפי מיגרציית RLS).</li>
          </ul>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {activeCat
            ? "אין פריטים בקטגוריה שנבחרה. נסו סינון אחר."
            : "אין עדיין פריטים בקטלוג."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
          <table className="w-full min-w-[64rem] border-collapse text-start text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-medium">שם</th>
                <th className="px-4 py-3 font-medium">קטגוריה</th>
                <th className="px-4 py-3 font-medium">במחסן</th>
                <th className="px-4 py-3 font-medium">משובץ</th>
                <th className="px-4 py-3 font-medium">פנוי</th>
                <th className="px-4 py-3 font-medium">מחיר יחידה</th>
                <th className="px-4 py-3 font-medium">מיקום</th>
                <th className="px-4 py-3 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b border-border transition-colors hover:bg-muted/30 last:border-0" key={row.id}>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.category || "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{row.total_qty}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{row.allocated}</td>
                  <td className="px-4 py-3 tabular-nums font-medium">{row.available}</td>
                  <td className="px-4 py-3">{formatCurrencyIl(row.rent_price)}</td>
                  <td className="max-w-[12rem] truncate px-4 py-3 text-muted-foreground">
                    {row.warehouse_location ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button asChild className={selectorButtonClass(false)} size="sm" variant="outline">
                      <Link href={`/equipment/${row.id}`}>עריכה</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
