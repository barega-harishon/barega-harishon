"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { upsertProjectSiteDetailsFromForm } from "@/actions/project-site-details";
import { CladdingSwatchGroup } from "@/components/inquiry/cladding-swatch-group";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectSiteDetails } from "@/types/project-site";

interface ProjectSiteDetailsFormProps {
  projectId: string;
  initial: ProjectSiteDetails | null;
}

function initialCarpetColor(site: ProjectSiteDetails | null): string {
  return site?.carpet_cladding_color?.trim() || site?.cladding_color?.trim() || "";
}

function initialFabricColor(site: ProjectSiteDetails | null): string {
  return site?.fabric_cladding_color?.trim() || site?.cladding_color?.trim() || "";
}

export function ProjectSiteDetailsForm({
  projectId,
  initial,
}: ProjectSiteDetailsFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    upsertProjectSiteDetailsFromForm,
    null,
  );

  const [carpetCladdingColor, setCarpetCladdingColor] = useState(() =>
    initialCarpetColor(initial),
  );
  const [fabricCladdingColor, setFabricCladdingColor] = useState(() =>
    initialFabricColor(initial),
  );

  useEffect(() => {
    setCarpetCladdingColor(initialCarpetColor(initial));
    setFabricCladdingColor(initialFabricColor(initial));
  }, [initial]);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input name="projectId" type="hidden" value={projectId} />

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="accessNotes">
          דרכי גישה
        </label>
        <Textarea
          defaultValue={initial?.access_notes ?? ""}
          id="accessNotes"
          name="accessNotes"
          placeholder="הנחיות גישה לשטח"
        />
      </div>

      <input name="carpetCladdingColor" type="hidden" value={carpetCladdingColor} />
      <input name="fabricCladdingColor" type="hidden" value={fabricCladdingColor} />
      <CladdingSwatchGroup
        onChange={setCarpetCladdingColor}
        title="צבע שטיח (חיפוי)"
        value={carpetCladdingColor}
      />
      <CladdingSwatchGroup
        onChange={setFabricCladdingColor}
        title="צבע בד (חיפוי)"
        value={fabricCladdingColor}
      />

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="notes">
          הערות
        </label>
        <Textarea
          defaultValue={initial?.notes ?? ""}
          id="notes"
          name="notes"
          placeholder="הערות כלליות לאירוע"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        תמונות שטח וסקיצה מנוהלות בסעיף &quot;מדיה וקבצים&quot; מתחת לטופס זה.
      </p>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          className="size-4 rounded border-border"
          defaultChecked={initial?.submitted_by_client ?? false}
          name="submittedByClient"
          type="checkbox"
          value="on"
        />
        <span>הטופס הוגש על ידי הלקוח</span>
      </label>

      {state && !state.success ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p>
      ) : null}

      <div className="flex justify-end">
        <Button disabled={isPending} type="submit">
          {isPending ? "שומרים…" : "שמירת פרטי אתר"}
        </Button>
      </div>
    </form>
  );
}
