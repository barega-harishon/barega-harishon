"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { upsertProjectSiteDetailsFromForm } from "@/actions/project-site-details";
import { CladdingSwatchGroup } from "@/components/inquiry/cladding-swatch-group";
import { Button } from "@/components/ui/button";
import { CLADDING_SWATCH_OPTIONS } from "@/lib/inquiry/cladding-options";
import type { ProjectSiteDetails } from "@/types/project-site";

interface ProjectCladdingColorsFormProps {
  projectId: string;
  initial: ProjectSiteDetails | null;
}

function initialCarpetColor(site: ProjectSiteDetails | null): string {
  return site?.carpet_cladding_color?.trim() || site?.cladding_color?.trim() || "";
}

function initialFabricColor(site: ProjectSiteDetails | null): string {
  return site?.fabric_cladding_color?.trim() || site?.cladding_color?.trim() || "";
}

export function ProjectCladdingColorsForm({ projectId, initial }: ProjectCladdingColorsFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(upsertProjectSiteDetailsFromForm, null);
  const [carpetCladdingColor, setCarpetCladdingColor] = useState(() => initialCarpetColor(initial));
  const [fabricCladdingColor, setFabricCladdingColor] = useState(() => initialFabricColor(initial));
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    setCarpetCladdingColor(initialCarpetColor(initial));
    setFabricCladdingColor(initialFabricColor(initial));
  }, [initial]);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [router, state?.success]);

  const selectedCarpetOption = CLADDING_SWATCH_OPTIONS.find((opt) => opt.value === carpetCladdingColor) ?? null;
  const selectedFabricOption = CLADDING_SWATCH_OPTIONS.find((opt) => opt.value === fabricCladdingColor) ?? null;

  return (
    <form action={formAction} className="space-y-4 rounded-[var(--radius)] border border-border bg-muted/20 p-4">
      <input name="projectId" type="hidden" value={projectId} />
      <input name="accessNotes" type="hidden" value={initial?.access_notes ?? ""} />
      <input name="notes" type="hidden" value={initial?.notes ?? ""} />
      <input name="submittedByClient" type="hidden" value={initial?.submitted_by_client ? "on" : ""} />
      <input name="carpetCladdingColor" type="hidden" value={carpetCladdingColor} />
      <input name="fabricCladdingColor" type="hidden" value={fabricCladdingColor} />

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">צבעי חיפוי נבחרים</h3>
        <Button onClick={() => setShowColorPicker((v) => !v)} size="sm" type="button" variant="outline">
          {showColorPicker ? "סגירת בחירת צבעים" : "שינוי צבעים"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-border bg-card p-3">
          <p className="mb-2 text-xs text-muted-foreground">שטיח</p>
          {selectedCarpetOption ? (
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-6 w-6 rounded-full border border-black/15"
                style={{ backgroundColor: selectedCarpetOption.hex }}
              />
              <div>
                <p className="text-sm font-medium">{selectedCarpetOption.label}</p>
                <p className="text-xs text-muted-foreground">{selectedCarpetOption.code}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">לא נבחר צבע.</p>
          )}
        </div>
        <div className="rounded-[var(--radius)] border border-border bg-card p-3">
          <p className="mb-2 text-xs text-muted-foreground">בד</p>
          {selectedFabricOption ? (
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-6 w-6 rounded-full border border-black/15"
                style={{ backgroundColor: selectedFabricOption.hex }}
              />
              <div>
                <p className="text-sm font-medium">{selectedFabricOption.label}</p>
                <p className="text-xs text-muted-foreground">{selectedFabricOption.code}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">לא נבחר צבע.</p>
          )}
        </div>
      </div>

      {showColorPicker ? (
        <>
          <CladdingSwatchGroup onChange={setCarpetCladdingColor} title="צבע שטיח (חיפוי)" value={carpetCladdingColor} />
          <CladdingSwatchGroup onChange={setFabricCladdingColor} title="צבע בד (חיפוי)" value={fabricCladdingColor} />
        </>
      ) : null}

      {state && !state.success ? <p className="text-sm text-destructive">{state.message}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p> : null}
      <div className="flex justify-end">
        <Button disabled={isPending} type="submit">
          {isPending ? "שומרים…" : "שמירת צבעי חיפוי"}
        </Button>
      </div>
    </form>
  );
}
