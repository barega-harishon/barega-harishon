import Link from "next/link";
import { ArrowRightCircle } from "lucide-react";
import { z } from "zod";

import { getInventoryCountLines, listInventoryCounts } from "@/actions/inventory-counts";
import { HeaderInfoModal } from "@/components/common/header-info-modal";
import { InventoryCountForm } from "@/components/equipment/inventory-count-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function parseCountId(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = z.string().uuid().safeParse(value);
  return parsed.success ? parsed.data : null;
}

export default async function EquipmentCountPage({
  searchParams,
}: {
  searchParams: Promise<{ count?: string | string[] }>;
}) {
  const sp = await searchParams;
  const selectedCountId = parseCountId(sp.count);
  const counts = await listInventoryCounts(30);
  const fallbackId = selectedCountId ?? counts[0]?.id ?? null;
  const lines = fallbackId ? await getInventoryCountLines(fallbackId) : [];

  return (
    <main className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">ספירת מלאי</h1>
          <HeaderInfoModal label="הנחיות ספירת מלאי">
            <p>הזינו כמויות נספרות, שמרו שורות, ואשרו ספירה ליצירת תנועות התאמה אוטומטיות.</p>
          </HeaderInfoModal>
        </div>
        <Button asChild variant="outline">
          <Link className="inline-flex items-center gap-1.5" href="/equipment">
            <ArrowRightCircle className="h-4 w-4" />
            חזרה למלאי
          </Link>
        </Button>
      </div>

      <div className="mb-4 rounded-[var(--radius)] border border-border bg-card p-3">
        <form action="/equipment/count" className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex w-full flex-col gap-1 text-xs font-medium sm:w-[26rem]">
            בחירת ספירה קיימת
            <select
              className="h-9 rounded-md border border-border bg-input px-3 text-sm"
              defaultValue={fallbackId ?? ""}
              name="count"
            >
              {counts.length === 0 ? <option value="">אין ספירות קיימות</option> : null}
              {counts.map((count) => (
                <option key={count.id} value={count.id}>
                  {count.created_at.slice(0, 10)} · {count.status === "posted" ? "אושרה" : "טיוטה"} ·{" "}
                  {count.note?.trim() || "ללא הערה"}
                </option>
              ))}
            </select>
          </label>
          <Button disabled={counts.length === 0} size="sm" type="submit" variant="outline">
            מעבר לספירה
          </Button>
        </form>
      </div>

      <InventoryCountForm
        key={fallbackId ?? "no-count-selected"}
        counts={counts}
        lines={lines}
        selectedCountId={fallbackId}
      />
    </main>
  );
}
