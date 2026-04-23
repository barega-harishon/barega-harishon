import Link from "next/link";
import { z } from "zod";

import { listEquipmentBatchAvailability } from "@/actions/equipment-batches";
import { listEquipmentOptions } from "@/actions/project-equipment";
import { BatchPickingForm } from "@/components/equipment/batch-picking-form";
import { EquipmentCategoryAccordion } from "@/components/equipment/equipment-category-accordion";
import { Button } from "@/components/ui/button";
import { groupEquipmentByCategory } from "@/lib/equipment/group-by-category";

export const dynamic = "force-dynamic";

function parseEquipmentId(raw: string | string[] | undefined): string | null {
  if (!raw) {
    return null;
  }
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = z.string().uuid().safeParse(value);
  return parsed.success ? parsed.data : null;
}

export default async function EquipmentPickingPage({
  searchParams,
}: {
  searchParams: Promise<{ equipment?: string | string[]; q?: string }>;
}) {
  const sp = await searchParams;
  const equipmentId = parseEquipmentId(sp.equipment);
  const searchTerm = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const options = await listEquipmentOptions();
  const filteredOptions =
    searchTerm.length >= 2
      ? options.filter((option) => {
          const byName = option.name.toLowerCase().includes(searchTerm);
          const byCategory = (option.category ?? "").toLowerCase().includes(searchTerm);
          return byName || byCategory;
        })
      : options;
  const groupedOptions = groupEquipmentByCategory(filteredOptions, (o) => o.category);
  const selectedEquipment = options.find((o) => o.id === equipmentId) ?? null;
  const batches = selectedEquipment ? await listEquipmentBatchAvailability(selectedEquipment.id) : [];

  return (
    <main className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ליקוט מחסן</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            בחרו פריט ציוד, סמנו אצוות, הזינו כמות ולחצו על אישור ליקוט.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/equipment">חזרה למלאי</Link>
        </Button>
      </div>

      <div className="mb-6 rounded-[var(--radius)] border border-border bg-card p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">בחירת פריט ציוד לפי קטגוריה</p>
          <form action="/equipment/picking" className="w-full sm:w-auto" method="get">
            {equipmentId ? <input name="equipment" type="hidden" value={equipmentId} /> : null}
            <input
              className="h-9 w-full rounded-md border border-border bg-input px-3 text-sm sm:w-[18rem]"
              defaultValue={sp.q ?? ""}
              name="q"
              placeholder="חיפוש פריט / קטגוריה"
              type="search"
            />
          </form>
        </div>
        <EquipmentCategoryAccordion
          defaultOpenFirst
          emptyMessage={searchTerm.length >= 2 ? "לא נמצאו פריטים לפי החיפוש." : "אין פריטי ציוד להצגה."}
          groups={groupedOptions.map((group) => ({
            key: group.key,
            label: group.label,
            count: group.items.length,
            content: (
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <Button
                    asChild
                    key={item.id}
                    size="sm"
                    variant={selectedEquipment?.id === item.id ? "default" : "outline"}
                  >
                    <Link href={`/equipment/picking?equipment=${item.id}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}>
                      {item.name}
                    </Link>
                  </Button>
                ))}
              </div>
            ),
          }))}
        />
      </div>

      {selectedEquipment ? (
        <BatchPickingForm
          batches={batches}
          equipmentId={selectedEquipment.id}
          source="warehouse"
          title={`ליקוט גלובלי מהמחסן עבור: ${selectedEquipment.name}`}
        />
      ) : (
        <p className="text-sm text-muted-foreground">בחרו פריט כדי להתחיל ליקוט.</p>
      )}
    </main>
  );
}
