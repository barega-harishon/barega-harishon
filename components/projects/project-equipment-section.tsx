"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  removeProjectEquipmentLine,
  upsertProjectEquipmentLine,
} from "@/actions/project-equipment";
import {
  autoPickProjectEquipmentRemaining,
  autoReturnProjectEquipmentPicked,
} from "@/actions/equipment-batches";
import { upsertProjectSiteDetails } from "@/actions/project-site-details";
import { BatchPickingForm } from "@/components/equipment/batch-picking-form";
import { CLADDING_SWATCH_OPTIONS } from "@/lib/inquiry/cladding-options";
import type {
  EquipmentAvailability,
  EquipmentOption,
  ProjectEquipmentLine,
} from "@/types/project-equipment";
import type { EquipmentBatchAvailabilityRow } from "@/types/equipment-batches";
import type { ProjectSiteDetails } from "@/types/project-site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";

const selectClassName =
  "flex h-10 w-full rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-center text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function sameNumericInput(current: string, initial: string): boolean {
  const c = current.trim();
  const i = initial.trim();
  if (c === "" && i === "") {
    return true;
  }
  if (c === "" || i === "") {
    return false;
  }
  const cNum = Number(c);
  const iNum = Number(i);
  if (!Number.isFinite(cNum) || !Number.isFinite(iNum)) {
    return c === i;
  }
  return cNum === iNum;
}

export interface ProjectEquipmentLineView extends ProjectEquipmentLine {
  headroom: number;
}

interface ProjectEquipmentSectionProps {
  projectId: string;
  lines: ProjectEquipmentLineView[];
  options: EquipmentOption[];
  availability: Record<string, EquipmentAvailability>;
  batchAvailabilityByEquipment: Record<string, EquipmentBatchAvailabilityRow[]>;
  siteDetails: ProjectSiteDetails | null;
}

export function ProjectEquipmentSection({
  projectId,
  lines,
  options,
  availability,
  batchAvailabilityByEquipment,
  siteDetails,
}: ProjectEquipmentSectionProps) {
  const router = useRouter();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [rowFeedback, setRowFeedback] = useState<{ variant: "error" | "success"; text: string } | null>(null);
  const [detailsLine, setDetailsLine] = useState<ProjectEquipmentLineView | null>(null);
  const [editingLine, setEditingLine] = useState<ProjectEquipmentLineView | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [bulkRows, setBulkRows] = useState<Array<{ key: string; equipmentId: string; quantity: number }>>([
    { key: "row-1", equipmentId: "", quantity: 1 },
  ]);
  const [showAddItems, setShowAddItems] = useState(false);
  const [carpetCladdingColor, setCarpetCladdingColor] = useState(siteDetails?.carpet_cladding_color ?? "");
  const [fabricCladdingColor, setFabricCladdingColor] = useState(siteDetails?.fabric_cladding_color ?? "");
  const [carpetCladdingMeters, setCarpetCladdingMeters] = useState<string>(
    siteDetails?.carpet_cladding_meters != null ? String(siteDetails.carpet_cladding_meters) : "",
  );
  const [carpetCladdingRolls, setCarpetCladdingRolls] = useState<string>(
    siteDetails?.carpet_cladding_rolls != null ? String(siteDetails.carpet_cladding_rolls) : "",
  );
  const [fabricCladdingMeters, setFabricCladdingMeters] = useState<string>(
    siteDetails?.fabric_cladding_meters != null ? String(siteDetails.fabric_cladding_meters) : "",
  );
  const [fabricCladdingRolls, setFabricCladdingRolls] = useState<string>(
    siteDetails?.fabric_cladding_rolls != null ? String(siteDetails.fabric_cladding_rolls) : "",
  );
  const [claddingChecklist, setCladdingChecklist] = useState({
    carpetPick: false,
    carpetReturn: false,
    fabricPick: false,
    fabricReturn: false,
  });

  useEffect(() => {
    if (!selectedCategory) {
      return;
    }
    const hasAnyInCategory = options.some((opt) => opt.category === selectedCategory);
    if (!hasAnyInCategory) {
      setSelectedCategory("");
      setBulkRows([{ key: "row-1", equipmentId: "", quantity: 1 }]);
    }
  }, [options, selectedCategory]);

  useEffect(() => {
    setCarpetCladdingColor(siteDetails?.carpet_cladding_color ?? "");
    setFabricCladdingColor(siteDetails?.fabric_cladding_color ?? "");
    setCarpetCladdingMeters(
      siteDetails?.carpet_cladding_meters != null ? String(siteDetails.carpet_cladding_meters) : "",
    );
    setCarpetCladdingRolls(
      siteDetails?.carpet_cladding_rolls != null ? String(siteDetails.carpet_cladding_rolls) : "",
    );
    setFabricCladdingMeters(
      siteDetails?.fabric_cladding_meters != null ? String(siteDetails.fabric_cladding_meters) : "",
    );
    setFabricCladdingRolls(
      siteDetails?.fabric_cladding_rolls != null ? String(siteDetails.fabric_cladding_rolls) : "",
    );
  }, [siteDetails]);

  function handleRemove(lineId: string) {
    startTransition(async () => {
      setRemoveError(null);
      const result = await removeProjectEquipmentLine({ lineId });
      if (result.success) {
        router.refresh();
      } else {
        setRemoveError(result.message);
      }
    });
  }

  function openEdit(line: ProjectEquipmentLineView) {
    setEditQuantity(line.quantity);
    setEditingLine(line);
  }

  function saveEdit() {
    if (!editingLine) {
      return;
    }
    startTransition(async () => {
      const result = await upsertProjectEquipmentLine({
        projectId,
        equipmentId: editingLine.equipment_id,
        quantity: editQuantity,
      });
      if (!result.success) {
        setRowFeedback({ variant: "error", text: result.message });
        return;
      }
      setRowFeedback({ variant: "success", text: result.message });
      setEditingLine(null);
      router.refresh();
    });
  }

  function addBulkRow() {
    setBulkRows((prev) => [
      ...prev,
      { key: `row-${Date.now()}-${Math.random()}`, equipmentId: "", quantity: 1 },
    ]);
  }

  function removeBulkRow(key: string) {
    setBulkRows((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((row) => row.key !== key);
    });
  }

  function updateBulkRow(
    key: string,
    patch: Partial<{ equipmentId: string; quantity: number }>,
  ) {
    setBulkRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function submitBulkRows() {
    if (!selectedCategory) {
      setRowFeedback({ variant: "error", text: "יש לבחור קטגוריה לפני שמירה." });
      return;
    }
    const normalized = bulkRows
      .map((row) => ({
        equipmentId: row.equipmentId.trim(),
        quantity: Number(row.quantity),
      }))
      .filter((row) => row.equipmentId !== "");

    if (normalized.length === 0) {
      setRowFeedback({ variant: "error", text: "יש לבחור לפחות פריט אחד להוספה." });
      return;
    }
    const hasInvalidQty = normalized.some(
      (row) => !Number.isFinite(row.quantity) || row.quantity < 1,
    );
    if (hasInvalidQty) {
      setRowFeedback({ variant: "error", text: "כמות חייבת להיות לפחות 1 בכל שורה." });
      return;
    }

    startTransition(async () => {
      setRowFeedback(null);
      let successCount = 0;
      for (const row of normalized) {
        const result = await upsertProjectEquipmentLine({
          projectId,
          equipmentId: row.equipmentId,
          quantity: row.quantity,
        });
        if (!result.success) {
          setRowFeedback({
            variant: "error",
            text:
              normalized.length > 1
                ? `השמירה נעצרה אחרי ${successCount} שורות. ${result.message}`
                : result.message,
          });
          router.refresh();
          return;
        }
        successCount += 1;
      }
      setRowFeedback({
        variant: "success",
        text: successCount === 1 ? "הפריט נשמר בהצלחה." : `${successCount} פריטים נשמרו בהצלחה.`,
      });
      setBulkRows([{ key: "row-1", equipmentId: "", quantity: 1 }]);
      router.refresh();
    });
  }

  function buildCladdingPayload(overrides?: {
    carpetColor?: string;
    fabricColor?: string;
    carpetMeters?: string;
    carpetRolls?: string;
    fabricMeters?: string;
    fabricRolls?: string;
  }) {
    return {
      projectId,
      accessNotes: siteDetails?.access_notes ?? "",
      notes: siteDetails?.notes ?? "",
      submittedByClient: siteDetails?.submitted_by_client ? "on" : "",
      carpetCladdingColor: overrides?.carpetColor ?? carpetCladdingColor,
      fabricCladdingColor: overrides?.fabricColor ?? fabricCladdingColor,
      carpetCladdingMeters:
        (overrides?.carpetMeters ?? carpetCladdingMeters).trim() === ""
          ? null
          : Number(overrides?.carpetMeters ?? carpetCladdingMeters),
      carpetCladdingRolls:
        (overrides?.carpetRolls ?? carpetCladdingRolls).trim() === ""
          ? null
          : Number(overrides?.carpetRolls ?? carpetCladdingRolls),
      fabricCladdingMeters:
        (overrides?.fabricMeters ?? fabricCladdingMeters).trim() === ""
          ? null
          : Number(overrides?.fabricMeters ?? fabricCladdingMeters),
      fabricCladdingRolls:
        (overrides?.fabricRolls ?? fabricCladdingRolls).trim() === ""
          ? null
          : Number(overrides?.fabricRolls ?? fabricCladdingRolls),
    };
  }

  function saveCladdingDetails(
    message: string,
    onSuccess?: () => void,
    overrides?: {
      carpetColor?: string;
      fabricColor?: string;
      carpetMeters?: string;
      carpetRolls?: string;
      fabricMeters?: string;
      fabricRolls?: string;
    },
  ) {
    startTransition(async () => {
      const result = await upsertProjectSiteDetails(buildCladdingPayload(overrides));
      if (!result.success) {
        setRowFeedback({ variant: "error", text: result.message });
        return;
      }
      setRowFeedback({ variant: "success", text: message });
      onSuccess?.();
      router.refresh();
    });
  }

  function confirmAndChangeCladdingColor(type: "carpet" | "fabric", nextColor: string) {
    const current = type === "carpet" ? carpetCladdingColor : fabricCladdingColor;
    if (current === nextColor) {
      return;
    }
    if (!window.confirm("לאשר החלפת גוון?")) {
      return;
    }
    if (type === "carpet") {
      setCarpetCladdingColor(nextColor);
      saveCladdingDetails("גוון שטיח עודכן.", undefined, { carpetColor: nextColor });
      return;
    }
    setFabricCladdingColor(nextColor);
    saveCladdingDetails("גוון בד עודכן.", undefined, { fabricColor: nextColor });
  }

  function removeCladdingRow(type: "carpet" | "fabric") {
    if (!window.confirm("לאשר הסרה של שורת החיפוי?")) {
      return;
    }
    if (type === "carpet") {
      setCarpetCladdingColor("");
      setCarpetCladdingMeters("");
      setCarpetCladdingRolls("");
      setCladdingChecklist((prev) => ({ ...prev, carpetPick: false, carpetReturn: false }));
      saveCladdingDetails("חיפוי שטיח הוסר.", undefined, {
        carpetColor: "",
        carpetMeters: "",
        carpetRolls: "",
      });
      return;
    }
    setFabricCladdingColor("");
    setFabricCladdingMeters("");
    setFabricCladdingRolls("");
    setCladdingChecklist((prev) => ({ ...prev, fabricPick: false, fabricReturn: false }));
    saveCladdingDetails("חיפוי בד הוסר.", undefined, {
      fabricColor: "",
      fabricMeters: "",
      fabricRolls: "",
    });
  }

  function handleChecklistPick(line: ProjectEquipmentLineView, checked: boolean) {
    if (!checked) {
      return;
    }
    startTransition(async () => {
      setRowFeedback(null);
      const result = await autoPickProjectEquipmentRemaining({
        projectId,
        equipmentId: line.equipment_id,
      });
      if (!result.success) {
        setRowFeedback({ variant: "error", text: result.message });
        return;
      }
      setRowFeedback({ variant: "success", text: result.message });
      router.refresh();
    });
  }

  function handleChecklistReturn(line: ProjectEquipmentLineView, checked: boolean) {
    if (!checked) {
      return;
    }
    startTransition(async () => {
      setRowFeedback(null);
      const result = await autoReturnProjectEquipmentPicked({
        projectId,
        equipmentId: line.equipment_id,
      });
      if (!result.success) {
        setRowFeedback({ variant: "error", text: result.message });
        return;
      }
      setRowFeedback({ variant: "success", text: result.message });
      router.refresh();
    });
  }

  const optionsById = useMemo(() => new Map(options.map((opt) => [opt.id, opt])), [options]);
  const categoryOptions = useMemo(
    () =>
      [...new Set(options.map((opt) => opt.category.trim()).filter((category) => category !== ""))].sort((a, b) =>
        a.localeCompare(b, "he"),
      ),
    [options],
  );
  const optionsInCategory = useMemo(
    () => options.filter((opt) => opt.category === selectedCategory),
    [options, selectedCategory],
  );
  const initialCarpetColor = siteDetails?.carpet_cladding_color ?? "";
  const initialFabricColor = siteDetails?.fabric_cladding_color ?? "";
  const initialCarpetMeters =
    siteDetails?.carpet_cladding_meters != null ? String(siteDetails.carpet_cladding_meters) : "";
  const initialCarpetRolls =
    siteDetails?.carpet_cladding_rolls != null ? String(siteDetails.carpet_cladding_rolls) : "";
  const initialFabricMeters =
    siteDetails?.fabric_cladding_meters != null ? String(siteDetails.fabric_cladding_meters) : "";
  const initialFabricRolls =
    siteDetails?.fabric_cladding_rolls != null ? String(siteDetails.fabric_cladding_rolls) : "";
  const carpetCladdingDirty =
    carpetCladdingColor !== initialCarpetColor ||
    !sameNumericInput(carpetCladdingMeters, initialCarpetMeters) ||
    !sameNumericInput(carpetCladdingRolls, initialCarpetRolls);
  const fabricCladdingDirty =
    fabricCladdingColor !== initialFabricColor ||
    !sameNumericInput(fabricCladdingMeters, initialFabricMeters) ||
    !sameNumericInput(fabricCladdingRolls, initialFabricRolls);
  const editQuantityDirty = editingLine ? Number(editQuantity) !== Number(editingLine.quantity) : false;

  return (
    <div className="space-y-6">
      {removeError ? (
        <p className="text-sm text-destructive" role="alert">
          {removeError}
        </p>
      ) : null}
      {rowFeedback ? (
        <p className={rowFeedback.variant === "error" ? "text-sm text-destructive" : "text-sm text-emerald-700 dark:text-emerald-400"}>
          {rowFeedback.text}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
        <table className="w-full min-w-[44rem] border-collapse text-center text-sm sm:min-w-[52rem]">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">פריט</th>
                <th className="px-3 py-2 font-medium">קטגוריה</th>
                <th className="px-3 py-2 font-medium">כמות שהוזמנה</th>
                <th className="px-3 py-2 font-medium">מיקום במחסן</th>
                <th className="px-3 py-2 font-medium">אישור ליקוט</th>
                <th className="px-3 py-2 font-medium">אישור החזרה</th>
                <th className="px-3 py-2 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const remainingNeed = Math.max(0, line.quantity - line.picked_qty);
                const pickedExists = line.picked_qty > 0;
                const availableToPick = (batchAvailabilityByEquipment[line.equipment_id] ?? []).reduce(
                  (sum, batch) => sum + Math.max(0, Number(batch.remaining_qty ?? 0)),
                  0,
                );
                const option = optionsById.get(line.equipment_id);
                const location = line.equipment?.warehouse_location ?? option?.warehouse_location ?? "—";
                return (
                  <tr
                    className="cursor-pointer border-b border-border transition-colors hover:bg-muted/30 last:border-0"
                    key={line.id}
                    onClick={() => setDetailsLine(line)}
                  >
                    <td className="px-3 py-2 font-medium">{line.equipment?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{line.equipment?.category ?? "—"}</td>
                    <td className="px-3 py-2">{line.quantity}</td>
                    <td className="px-3 py-2 text-muted-foreground">{location || "—"}</td>
                    <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                      <label className="inline-flex items-center gap-2 text-xs">
                        <input
                          checked={false}
                          disabled={pending || remainingNeed === 0 || availableToPick <= 0}
                          onChange={(event) => handleChecklistPick(line, event.target.checked)}
                          type="checkbox"
                        />
                        <span className="text-muted-foreground">
                          {remainingNeed === 0
                            ? "לא נדרש"
                            : availableToPick <= 0
                              ? "אין מלאי לליקוט"
                              : `חסר ${remainingNeed}`}
                        </span>
                      </label>
                    </td>
                    <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                      <label className="inline-flex items-center gap-2 text-xs">
                        <input
                          checked={false}
                          disabled={pending || !pickedExists}
                          onChange={(event) => handleChecklistReturn(line, event.target.checked)}
                          type="checkbox"
                        />
                        <span className="text-muted-foreground">
                          {line.picked_qty === 0 ? "לא נדרש" : `נלקט ${line.picked_qty}`}
                        </span>
                      </label>
                    </td>
                    <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={() => openEdit(line)} size="sm" type="button" variant="outline">
                          עריכה
                        </Button>
                        <Button
                          disabled={pending}
                          onClick={() => handleRemove(line.id)}
                          size="sm"
                          type="button"
                          variant="destructive"
                        >
                          הסרה
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-sm text-muted-foreground" colSpan={7}>
                    אין עדיין ציוד משובץ לפרויקט.
                  </td>
                </tr>
              ) : null}
              <tr className="border-t border-border bg-muted/5 align-top">
                <td className="px-3 py-2">
                  <div className="grid gap-2">
                    <span className="font-medium">חיפוי שטיח</span>
                    <select
                      className={selectClassName}
                      id="carpetCladdingColor"
                      onChange={(event) => confirmAndChangeCladdingColor("carpet", event.target.value)}
                      value={carpetCladdingColor}
                    >
                      <option value="">גוון שטיח</option>
                      {CLADDING_SWATCH_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">חיפויים</td>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <label className="block text-xs text-muted-foreground" htmlFor="carpetMeters">
                      מטרים
                    </label>
                    <Input
                      className="text-center"
                      id="carpetMeters"
                      min={0}
                      onChange={(event) => setCarpetCladdingMeters(event.target.value)}
                      step="0.01"
                      type="number"
                      value={carpetCladdingMeters}
                    />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <label className="block text-xs text-muted-foreground" htmlFor="carpetRolls">
                      גלילים
                    </label>
                    <Input
                      className="text-center"
                      id="carpetRolls"
                      min={0}
                      onChange={(event) => setCarpetCladdingRolls(event.target.value)}
                      step={1}
                      type="number"
                      value={carpetCladdingRolls}
                    />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      checked={claddingChecklist.carpetPick}
                      onChange={(event) =>
                        setCladdingChecklist((prev) => ({ ...prev, carpetPick: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span className="text-muted-foreground">ליקוט</span>
                  </label>
                </td>
                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      checked={claddingChecklist.carpetReturn}
                      onChange={(event) =>
                        setCladdingChecklist((prev) => ({ ...prev, carpetReturn: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span className="text-muted-foreground">החזרה</span>
                  </label>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {carpetCladdingDirty ? (
                      <Button
                        disabled={pending}
                        onClick={() => saveCladdingDetails("חיפוי שטיח נשמר בהצלחה.")}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        שמור שינויים
                      </Button>
                    ) : null}
                    <Button
                      disabled={pending}
                      onClick={() => removeCladdingRow("carpet")}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      הסרה
                    </Button>
                  </div>
                </td>
              </tr>
              <tr className="border-t border-border bg-muted/5 align-top">
                <td className="px-3 py-2">
                  <div className="grid gap-2">
                    <span className="font-medium">חיפוי בד</span>
                    <select
                      className={selectClassName}
                      id="fabricCladdingColor"
                      onChange={(event) => confirmAndChangeCladdingColor("fabric", event.target.value)}
                      value={fabricCladdingColor}
                    >
                      <option value="">גוון בד</option>
                      {CLADDING_SWATCH_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">חיפויים</td>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <label className="block text-xs text-muted-foreground" htmlFor="fabricMeters">
                      מטרים
                    </label>
                    <Input
                      className="text-center"
                      id="fabricMeters"
                      min={0}
                      onChange={(event) => setFabricCladdingMeters(event.target.value)}
                      step="0.01"
                      type="number"
                      value={fabricCladdingMeters}
                    />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <label className="block text-xs text-muted-foreground" htmlFor="fabricRolls">
                      גלילים
                    </label>
                    <Input
                      className="text-center"
                      id="fabricRolls"
                      min={0}
                      onChange={(event) => setFabricCladdingRolls(event.target.value)}
                      step={1}
                      type="number"
                      value={fabricCladdingRolls}
                    />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      checked={claddingChecklist.fabricPick}
                      onChange={(event) =>
                        setCladdingChecklist((prev) => ({ ...prev, fabricPick: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span className="text-muted-foreground">ליקוט</span>
                  </label>
                </td>
                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      checked={claddingChecklist.fabricReturn}
                      onChange={(event) =>
                        setCladdingChecklist((prev) => ({ ...prev, fabricReturn: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span className="text-muted-foreground">החזרה</span>
                  </label>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {fabricCladdingDirty ? (
                      <Button
                        disabled={pending}
                        onClick={() => saveCladdingDetails("חיפוי בד נשמר בהצלחה.")}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        שמור שינויים
                      </Button>
                    ) : null}
                    <Button
                      disabled={pending}
                      onClick={() => removeCladdingRow("fabric")}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      הסרה
                    </Button>
                  </div>
                </td>
              </tr>
              {showAddItems ? (
                <tr className="border-t border-border bg-muted/5 align-top">
                  <td className="px-3 py-3" colSpan={7}>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground" htmlFor="equipmentCategory">
                          קטגוריה
                        </label>
                        <select
                          className={selectClassName}
                          id="equipmentCategory"
                          onChange={(event) => {
                            setSelectedCategory(event.target.value);
                            setBulkRows([{ key: "row-1", equipmentId: "", quantity: 1 }]);
                          }}
                          value={selectedCategory}
                        >
                          <option value="">בחרו קטגוריה</option>
                          {categoryOptions.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                      {selectedCategory ? (
                        <div className="space-y-3 rounded-[var(--radius)] border border-border bg-background/70 p-3">
                          {bulkRows.map((row, index) => (
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto]" key={row.key}>
                              <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground" htmlFor={`bulk-equipment-${row.key}`}>
                                  פריט {index + 1}
                                </label>
                                <select
                                  className={selectClassName}
                                  id={`bulk-equipment-${row.key}`}
                                  onChange={(event) => updateBulkRow(row.key, { equipmentId: event.target.value })}
                                  value={row.equipmentId}
                                >
                                  <option value="">בחרו פריט</option>
                                  {optionsInCategory.map((opt) => {
                                    const snap = availability[opt.id];
                                    return (
                                      <option key={opt.id} value={opt.id}>
                                        {opt.name}
                                        {snap ? ` — במלאי ${snap.totalQty}, פנוי במערכת ${snap.available}` : ""}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground" htmlFor={`bulk-quantity-${row.key}`}>
                                  כמות
                                </label>
                                <Input
                                  className="text-center"
                                  id={`bulk-quantity-${row.key}`}
                                  min={1}
                                  onChange={(event) => updateBulkRow(row.key, { quantity: Number(event.target.value) })}
                                  type="number"
                                  value={row.quantity}
                                />
                              </div>
                              <div className="flex items-end">
                                <Button
                                  disabled={pending || bulkRows.length === 1}
                                  onClick={() => removeBulkRow(row.key)}
                                  type="button"
                                  variant="ghost"
                                >
                                  הסרה
                                </Button>
                              </div>
                            </div>
                          ))}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Button disabled={pending} onClick={addBulkRow} type="button" variant="outline">
                              הוסף פריט נוסף
                            </Button>
                            <Button disabled={pending || optionsInCategory.length === 0} onClick={submitBulkRows} type="button">
                              {pending ? "שומרים…" : "אישור כל הפריטים"}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      <div className="mt-3 flex justify-center">
        <Button
          className="w-[min(92vw,20rem)] border-[#d6a676] bg-[#d6a676] text-[#2b1907] shadow-md hover:bg-[#c9935e] sm:w-auto"
          onClick={() => setShowAddItems((prev) => !prev)}
          size="sm"
          type="button"
          variant="outline"
        >
          {showAddItems ? "סגירת הוספת פריט" : "הוספת פריט"}
        </Button>
      </div>

      {options.length === 0 ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          אין פריטי ציוד בטבלת <code className="rounded bg-muted px-1">equipment</code>. הוסיפו
          פריטים ב־Supabase כדי לשבץ ציוד.
        </p>
      ) : null}

      <Modal onOpenChange={(open) => !open && setDetailsLine(null)} open={Boolean(detailsLine)}>
        <ModalContent className="w-[min(96vw,72rem)]">
          <ModalHeader>
            <ModalTitle>פרטי שורת ציוד</ModalTitle>
          </ModalHeader>
          {detailsLine ? (
            <div className="space-y-3">
              <div className="grid gap-2 rounded-[var(--radius)] border border-border bg-muted/20 p-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">פריט:</span>{" "}
                  <span className="font-medium">{detailsLine.equipment?.name ?? "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">כמות שהוזמנה:</span>{" "}
                  <span className="font-medium">{detailsLine.quantity}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">נלקט בפועל:</span>{" "}
                  <span className="font-medium">{detailsLine.picked_qty}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">יתרה לליקוט:</span>{" "}
                  <span className="font-medium">{Math.max(0, detailsLine.quantity - detailsLine.picked_qty)}</span>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <BatchPickingForm
                  batches={batchAvailabilityByEquipment[detailsLine.equipment_id] ?? []}
                  equipmentId={detailsLine.equipment_id}
                  maxTotalQty={Math.max(0, detailsLine.quantity - detailsLine.picked_qty)}
                  projectId={projectId}
                  source="project"
                  title={`ליקוט מהמחסן לפריט: ${detailsLine.equipment?.name ?? "—"}`}
                  txType="pick"
                />
                <BatchPickingForm
                  batches={batchAvailabilityByEquipment[detailsLine.equipment_id] ?? []}
                  equipmentId={detailsLine.equipment_id}
                  maxTotalQty={Math.max(0, detailsLine.picked_qty)}
                  projectId={projectId}
                  source="project"
                  title={`החזרה למחסן לפריט: ${detailsLine.equipment?.name ?? "—"}`}
                  txType="return"
                />
              </div>
            </div>
          ) : null}
        </ModalContent>
      </Modal>

      <Modal onOpenChange={(open) => !open && setEditingLine(null)} open={Boolean(editingLine)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>עריכת כמות לפרויקט</ModalTitle>
          </ModalHeader>
          {editingLine ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                פריט: <span className="font-medium text-foreground">{editingLine.equipment?.name ?? "—"}</span>
              </p>
              <Input min={1} onChange={(event) => setEditQuantity(Number(event.target.value))} type="number" value={editQuantity} />
              <div className="flex justify-end gap-2">
                <Button onClick={() => setEditingLine(null)} type="button" variant="ghost">
                  ביטול
                </Button>
                {editQuantityDirty ? (
                  <Button
                    disabled={pending || !Number.isFinite(editQuantity) || editQuantity < 1}
                    onClick={saveEdit}
                    type="button"
                  >
                    שמור שינויים
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </ModalContent>
      </Modal>
    </div>
  );
}
