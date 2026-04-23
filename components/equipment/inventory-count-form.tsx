"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import {
  createInventoryCount,
  postInventoryCount,
  upsertInventoryCountLines,
} from "@/actions/inventory-counts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EquipmentCategoryAccordion } from "@/components/equipment/equipment-category-accordion";
import { groupEquipmentByCategory } from "@/lib/equipment/group-by-category";
import type { InventoryCountLineRow, InventoryCountRow } from "@/types/inventory-counts";

interface InventoryCountFormProps {
  counts: InventoryCountRow[];
  selectedCountId: string | null;
  lines: InventoryCountLineRow[];
}

export function InventoryCountForm({ counts, selectedCountId, lines }: InventoryCountFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [deltaFilter, setDeltaFilter] = useState<"all" | "diff">("all");
  const [lineValues, setLineValues] = useState<Record<string, number>>(
    Object.fromEntries(lines.map((l) => [l.equipment_id, l.counted_qty])),
  );

  const selectedCount = useMemo(
    () => counts.find((c) => c.id === selectedCountId) ?? null,
    [counts, selectedCountId],
  );
  const isPosted = selectedCount?.status === "posted";
  const filteredLines = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return lines.filter((line) => {
      const counted = Math.max(0, Math.trunc(lineValues[line.equipment_id] ?? line.counted_qty));
      const delta = counted - line.expected_qty;
      if (deltaFilter === "diff" && delta === 0) {
        return false;
      }
      if (normalizedQuery.length < 2) {
        return true;
      }
      const byName = (line.equipment_name ?? "").toLowerCase().includes(normalizedQuery);
      const byCategory = (line.equipment_category ?? "").toLowerCase().includes(normalizedQuery);
      return byName || byCategory;
    });
  }, [deltaFilter, lineValues, lines, query]);
  const groupedLines = useMemo(
    () => groupEquipmentByCategory(filteredLines, (line) => line.equipment_category ?? ""),
    [filteredLines],
  );

  function updateQty(equipmentId: string, next: number) {
    setLineValues((prev) => ({ ...prev, [equipmentId]: Number.isFinite(next) ? Math.max(0, next) : 0 }));
  }

  function createCount() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await createInventoryCount({ note });
      if (!result.success || !result.data?.id) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      router.push(`/equipment/count?count=${result.data.id}`);
      router.refresh();
    });
  }

  function saveLines() {
    if (!selectedCountId) {
      return;
    }
    setError(null);
    setMessage(null);
    const payload = lines.map((line) => ({
      equipmentId: line.equipment_id,
      countedQty: Math.max(0, Math.trunc(lineValues[line.equipment_id] ?? line.counted_qty)),
    }));
    startTransition(async () => {
      const result = await upsertInventoryCountLines({ countId: selectedCountId, lines: payload });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      router.refresh();
    });
  }

  function postCount() {
    if (!selectedCountId) {
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await postInventoryCount({ countId: selectedCountId });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius)] border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">פתיחת ספירת מלאי חדשה</h3>
        <p className="mt-1 text-xs text-muted-foreground">הספירה נוצרת עם ערכי צפוי לפי מצב נוכחי.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="w-full space-y-1.5 sm:min-w-[18rem] sm:w-auto">
            <label className="text-xs font-medium" htmlFor="count-note">
              הערה (אופציונלי)
            </label>
            <Input id="count-note" onChange={(e) => setNote(e.target.value)} value={note} />
          </div>
          <Button className="w-full sm:w-auto" disabled={pending} onClick={createCount} type="button">
            {pending ? "פותחים…" : "פתיחת ספירה"}
          </Button>
        </div>
        {selectedCountId ? null : error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        {selectedCountId ? null : message ? (
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>
        ) : null}
      </div>

      {selectedCountId ? (
        <div className="rounded-[var(--radius)] border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">ספירה פעילה</p>
              <p className="text-xs text-muted-foreground">
                מזהה: <code>{selectedCountId.slice(0, 8)}…</code> | סטטוס: {selectedCount?.status ?? "draft"}
              </p>
            </div>
            {!isPosted ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  className="w-full sm:w-auto"
                  disabled={pending}
                  onClick={saveLines}
                  type="button"
                  variant="outline"
                >
                  שמירת שורות
                </Button>
                <Button className="w-full sm:w-auto" disabled={pending} onClick={postCount} type="button">
                  אישור וסגירת ספירה
                </Button>
              </div>
            ) : null}
          </div>

          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">לא נמצאו שורות לספירה זו.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-[18rem]">
                  <Search className="pointer-events-none absolute end-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pe-8"
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="חיפוש פריט / קטגוריה"
                    type="search"
                    value={query}
                  />
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    className="flex-1 sm:flex-initial"
                    onClick={() => setDeltaFilter("all")}
                    size="sm"
                    type="button"
                    variant={deltaFilter === "all" ? "default" : "outline"}
                  >
                    הכל
                  </Button>
                  <Button
                    className="flex-1 sm:flex-initial"
                    onClick={() => setDeltaFilter("diff")}
                    size="sm"
                    type="button"
                    variant={deltaFilter === "diff" ? "default" : "outline"}
                  >
                    עם פערים
                  </Button>
                </div>
              </div>
              {filteredLines.length === 0 ? (
                <p className="text-sm text-muted-foreground">אין שורות תואמות לחיפוש/סינון.</p>
              ) : (
                <EquipmentCategoryAccordion
                  defaultOpenFirst
                  groups={groupedLines.map((group) => ({
                    key: group.key,
                    label: group.label,
                    count: group.items.length,
                    content: (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[48rem] text-sm">
                          <thead>
                            <tr className="border-b border-border text-start text-muted-foreground">
                              <th className="py-2">פריט</th>
                              <th className="py-2">צפוי</th>
                              <th className="py-2">נספר</th>
                              <th className="py-2">הפרש</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((line) => {
                              const counted = Math.max(
                                0,
                                Math.trunc(lineValues[line.equipment_id] ?? line.counted_qty),
                              );
                              const delta = counted - line.expected_qty;
                              return (
                                <tr className="border-b border-border/70" key={line.id}>
                                  <td className="py-2 font-medium">
                                    {line.equipment_name ?? line.equipment_id.slice(0, 8)}
                                  </td>
                                  <td className="py-2">{line.expected_qty}</td>
                                  <td className="py-2">
                                    <Input
                                      className="w-28"
                                      disabled={isPosted || pending}
                                      min={0}
                                      onChange={(e) => updateQty(line.equipment_id, Number(e.target.value))}
                                      type="number"
                                      value={counted}
                                    />
                                  </td>
                                  <td
                                    className={`py-2 ${delta === 0 ? "" : delta > 0 ? "text-emerald-700" : "text-destructive"}`}
                                  >
                                    {delta > 0 ? `+${delta}` : delta}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ),
                  }))}
                />
              )}
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">פתחו ספירה חדשה כדי להתחיל.</p>
      )}

      {selectedCountId ? (
        <>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p> : null}
        </>
      ) : null}
    </div>
  );
}
