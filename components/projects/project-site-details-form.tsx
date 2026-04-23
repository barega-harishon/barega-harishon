"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { upsertProjectSiteDetailsFromForm } from "@/actions/project-site-details";
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

  const [carpetCladdingColor] = useState(() => initialCarpetColor(initial));
  const [fabricCladdingColor] = useState(() => initialFabricColor(initial));
  const [accessNotes, setAccessNotes] = useState(initial?.access_notes ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [editingAccessNotes, setEditingAccessNotes] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);

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
        <input name="accessNotes" type="hidden" value={accessNotes} />
        {editingAccessNotes ? (
          <Textarea
            className="min-h-[96px]"
            id="accessNotes"
            onBlur={() => setEditingAccessNotes(false)}
            onChange={(event) => setAccessNotes(event.target.value)}
            placeholder="הנחיות גישה לשטח"
            value={accessNotes}
          />
        ) : (
          <div
            className={`rounded-[var(--radius)] border border-border/90 bg-input px-3 py-2 text-sm ${
              accessNotes.trim() ? "min-h-[96px] whitespace-pre-wrap text-foreground" : "min-h-[40px] text-muted-foreground"
            }`}
          >
            <div className="relative pe-10">
              <span>{accessNotes.trim() || "ריק"}</span>
              <Button
                aria-label="עריכת דרכי גישה"
                className="absolute end-0 top-0 h-6 w-6"
                onClick={() => setEditingAccessNotes(true)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <input name="carpetCladdingColor" type="hidden" value={carpetCladdingColor} />
      <input name="fabricCladdingColor" type="hidden" value={fabricCladdingColor} />

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="notes">
          הערות
        </label>
        <input name="notes" type="hidden" value={notes} />
        {editingNotes ? (
          <Textarea
            className="min-h-[96px]"
            id="notes"
            onBlur={() => setEditingNotes(false)}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="הערות כלליות לאירוע"
            value={notes}
          />
        ) : (
          <div
            className={`rounded-[var(--radius)] border border-border/90 bg-input px-3 py-2 text-sm ${
              notes.trim() ? "min-h-[96px] whitespace-pre-wrap text-foreground" : "min-h-[40px] text-muted-foreground"
            }`}
          >
            <div className="relative pe-10">
              <span>{notes.trim() || "ריק"}</span>
              <Button
                aria-label="עריכת הערות"
                className="absolute end-0 top-0 h-6 w-6"
                onClick={() => setEditingNotes(true)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

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
