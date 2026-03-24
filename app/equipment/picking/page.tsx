import Link from "next/link";
import { z } from "zod";

import { listEquipmentBatchAvailability } from "@/actions/equipment-batches";
import { listEquipmentOptions } from "@/actions/project-equipment";
import { BatchPickingForm } from "@/components/equipment/batch-picking-form";
import { Button } from "@/components/ui/button";

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
  searchParams: Promise<{ equipment?: string | string[] }>;
}) {
  const sp = await searchParams;
  const equipmentId = parseEquipmentId(sp.equipment);
  const options = await listEquipmentOptions();
  const selectedEquipment = options.find((o) => o.id === equipmentId) ?? null;
  const batches = selectedEquipment ? await listEquipmentBatchAvailability(selectedEquipment.id) : [];

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
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

      <form className="mb-6 rounded-[var(--radius)] border border-border bg-card p-4" method="get">
        <label className="mb-2 block text-sm font-medium" htmlFor="equipment">
          פריט ציוד
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 min-w-[18rem] rounded-[var(--radius)] border border-border bg-input px-3 text-sm"
            defaultValue={selectedEquipment?.id ?? ""}
            id="equipment"
            name="equipment"
          >
            <option value="">בחרו פריט…</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <Button type="submit">הצג אצוות</Button>
        </div>
      </form>

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
