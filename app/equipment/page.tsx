import Link from "next/link";
import { Filter, Info, Search, SquarePen } from "lucide-react";

import {
  listEquipmentCategoryOptions,
  listEquipmentRowsWithAvailability,
} from "@/actions/equipment-catalog";
import { EquipmentCategoryAccordion } from "@/components/equipment/equipment-category-accordion";
import { EquipmentToolbarActions } from "@/components/equipment/equipment-toolbar-actions";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { EQUIPMENT_UNCATEGORIZED } from "@/lib/equipment/catalog-constants";
import { groupEquipmentByCategory } from "@/lib/equipment/group-by-category";
import { formatCurrencyIl } from "@/utils/money";

export const dynamic = "force-dynamic";

function parseCategoryParams(raw: string | string[] | undefined): string[] {
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return values
    .map((value) => {
      try {
        return decodeURIComponent(value).trim();
      } catch {
        return value.trim();
      }
    })
    .filter(Boolean);
}

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ cats?: string | string[]; q?: string }>;
}) {
  const sp = await searchParams;
  const activeCats = parseCategoryParams(sp.cats);
  const searchTerm = typeof sp.q === "string" ? sp.q.trim() : "";

  const [{ categories, hasUncategorized }, rows] = await Promise.all([
    listEquipmentCategoryOptions(),
    listEquipmentRowsWithAvailability({ categories: activeCats, search: searchTerm }),
  ]);
  const groupedRows = groupEquipmentByCategory(rows, (row) => row.category);
  const allFilterOptions = [
    ...(hasUncategorized ? [{ value: EQUIPMENT_UNCATEGORIZED, label: "ללא קטגוריה" }] : []),
    ...categories.map((cat) => ({ value: cat, label: cat })),
  ];
  const sharedColumns = (
    <colgroup>
      <col className="w-[20%]" />
      <col className="w-[12%]" />
      <col className="w-[9%]" />
      <col className="w-[9%]" />
      <col className="w-[9%]" />
      <col className="w-[12%]" />
      <col className="w-[17%]" />
      <col className="w-[12%]" />
    </colgroup>
  );

  return (
    <main className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">מלאי ציוד</h1>
          <Modal>
            <ModalTrigger asChild>
              <Button
                aria-label="הנחיות מלאי"
                className="h-auto w-auto rounded-none border-0 bg-transparent p-0 shadow-none hover:bg-transparent"
                size="icon"
                type="button"
                variant="ghost"
              >
                <Info className="h-4 w-4" />
              </Button>
            </ModalTrigger>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>הנחיות</ModalTitle>
              </ModalHeader>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  מסך זה מרכז את ניהול המלאי: צפייה במצב עדכני, הוספת ציוד, ייבוא/ייצוא נתונים, ולניהול
                  תהליכי מחסן.
                </p>
                <ul className="list-disc space-y-1 pe-5">
                  <li>
                    <strong className="text-foreground">במחסן</strong> - הכמות הפיזית הזמינה במערכת.
                  </li>
                  <li>
                    <strong className="text-foreground">משובץ</strong> - כמות שמוקצת לפרויקטים פתוחים.
                  </li>
                  <li>
                    <strong className="text-foreground">פנוי</strong> - מה שניתן לשבץ כרגע (במחסן פחות
                    משובץ).
                  </li>
                  <li>
                    <strong className="text-foreground">חיפוש</strong> - חיפוש לפי שם פריט, קטגוריה או
                    מיקום במחסן.
                  </li>
                  <li>
                    <strong className="text-foreground">סינון</strong> - בחירת קטגוריה אחת או יותר לתצוגה
                    ממוקדת.
                  </li>
                  <li>
                    <strong className="text-foreground">הוספת פרטים</strong> - הוספת פריט ידנית או ייבוא
                    מקובץ אקסל/CSV לפי תבנית.
                  </li>
                  <li>
                    <strong className="text-foreground">הורדת אקסל</strong> - ייצוא כלל הציוד, מצב מלאי
                    נוכחי, או מצב לפי תאריך נבחר.
                  </li>
                  <li>
                    <strong className="text-foreground">ליקוט מחסן</strong> - סימון מה יצא מהמחסן בפועל.
                  </li>
                  <li>
                    <strong className="text-foreground">ספירת מלאי</strong> - ביצוע ספירה, השוואה למערכת
                    ותיעוד פערים.
                  </li>
                </ul>
              </div>
            </ModalContent>
          </Modal>
        </div>
      </div>

      <EquipmentToolbarActions />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center justify-between sm:w-auto sm:justify-start sm:gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">רשימת פריטים</h2>
          <Modal>
            <ModalTrigger asChild>
              <Button size="sm" type="button" variant="outline">
                <Filter className="me-1 h-4 w-4" />
                סינון
              </Button>
            </ModalTrigger>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>סינון לפי קטגוריות</ModalTitle>
              </ModalHeader>
              <form action="/equipment" className="space-y-3" method="get">
                {searchTerm ? <input name="q" type="hidden" value={searchTerm} /> : null}
                <select
                  className="min-h-[12rem] w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                  defaultValue={activeCats}
                  multiple
                  name="cats"
                >
                  {allFilterOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button size="sm" type="submit" variant="outline">
                    <Filter className="me-1 h-4 w-4" />
                    החל סינון
                  </Button>
                  <Button asChild size="sm" type="button" variant="ghost">
                    <Link className="inline-flex items-center gap-1.5" href="/equipment">
                      <SquarePen className="h-4 w-4" />
                      ניקוי
                    </Link>
                  </Button>
                </div>
              </form>
            </ModalContent>
          </Modal>
        </div>
        <form action="/equipment" className="flex w-full items-center gap-2 sm:w-auto" method="get">
          {activeCats.map((cat) => (
            <input key={cat} name="cats" type="hidden" value={cat} />
          ))}
          <div className="relative w-full sm:w-auto">
            <Search className="pointer-events-none absolute end-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-9 w-full rounded-md border border-border bg-input pe-8 ps-3 text-sm sm:w-[18rem]"
              defaultValue={searchTerm}
              name="q"
              placeholder="חיפוש פריט / קטגוריה / מיקום"
              type="search"
            />
          </div>
        </form>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[64rem]">
          <EquipmentCategoryAccordion
            emptyMessage={
              activeCats.length > 0
                ? "אין פריטים בקטגוריות שנבחרו. נסו סינון אחר."
                : "אין עדיין פריטים בקטלוג."
            }
            stickyGroupHeaders
            headerContent={
              <div className="mb-2">
                <table className="w-full border-collapse text-start text-sm">
                  {sharedColumns}
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
                </table>
              </div>
            }
            groups={groupedRows.map((group) => ({
              key: group.key,
              label: group.label,
              count: group.items.length,
              content: (
                <table className="w-full border-collapse text-start text-sm">
                  {sharedColumns}
                  <tbody>
                    {group.items.map((row) => (
                      <tr
                        className="border-b border-border transition-colors hover:bg-muted/30 last:border-0"
                        key={row.id}
                      >
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
                          <Button asChild size="sm" variant="outline">
                            <Link className="inline-flex items-center gap-1.5" href={`/equipment/${row.id}`}>
                              <SquarePen className="h-4 w-4" />
                              עריכה
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ),
            }))}
          />
        </div>
      </div>
    </main>
  );
}
