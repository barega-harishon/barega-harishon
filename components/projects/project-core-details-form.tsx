"use client";

import { useActionState, useEffect } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { updateProjectCoreFromForm } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/types/common";
import type { ProjectDetailRow } from "@/types/projects";
import { toDateTimeLocalValue } from "@/utils/date";

interface ProjectCoreDetailsFormProps {
  project: ProjectDetailRow;
}

export function ProjectCoreDetailsForm({ project }: ProjectCoreDetailsFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateProjectCoreFromForm,
    null as ActionResult<Record<string, never>> | null,
  );

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  const [locationAddress, setLocationAddress] = useState(project.location_address ?? "");
  const [setupStartsAt, setSetupStartsAt] = useState(toDateTimeLocalValue(project.setup_starts_at));
  const [eventStartsAt, setEventStartsAt] = useState(toDateTimeLocalValue(project.event_starts_at));
  const [eventEndsAt, setEventEndsAt] = useState(toDateTimeLocalValue(project.event_ends_at));
  const [teardownAt, setTeardownAt] = useState(toDateTimeLocalValue(project.teardown_at));
  const [editingLocation, setEditingLocation] = useState(false);
  const [editingSetup, setEditingSetup] = useState(false);
  const [editingEventStart, setEditingEventStart] = useState(false);
  const [editingEventEnd, setEditingEventEnd] = useState(false);
  const [editingTeardown, setEditingTeardown] = useState(false);

  return (
    <form action={formAction} className="space-y-4 rounded-[var(--radius)] border border-border bg-muted/20 p-4">
      <input name="projectId" type="hidden" value={project.id} />
      <input name="locationAddress" type="hidden" value={locationAddress} />
      <input name="setupStartsAt" type="hidden" value={setupStartsAt} />
      <input name="eventStartsAt" type="hidden" value={eventStartsAt} />
      <input name="eventEndsAt" type="hidden" value={eventEndsAt} />
      <input name="teardownAt" type="hidden" value={teardownAt} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="locationAddress">
          כתובת אירוע <span className="text-destructive">*</span>
        </label>
        {editingLocation ? (
          <Input
            id="locationAddress"
            onBlur={() => setEditingLocation(false)}
            onChange={(event) => setLocationAddress(event.target.value)}
            required
            type="text"
            value={locationAddress}
          />
        ) : (
          <div className="relative rounded-[var(--radius)] border border-border/90 bg-input px-3 py-2 pe-10 text-sm text-foreground">
            <span>{locationAddress.trim() || "ריק"}</span>
            <Button
              aria-label="עריכת כתובת"
              className="absolute end-2 top-1/2 h-6 w-6 -translate-y-1/2"
              onClick={() => setEditingLocation(true)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="setupStartsAt">
            הקמה
          </label>
          {editingSetup ? (
            <Input
              className="[direction:ltr] text-start"
              id="setupStartsAt"
              onBlur={() => setEditingSetup(false)}
              onChange={(event) => setSetupStartsAt(event.target.value)}
              type="datetime-local"
              value={setupStartsAt}
            />
          ) : (
            <div className="relative rounded-[var(--radius)] border border-border/90 bg-input px-3 py-2 pe-10 text-sm">
              <span className={setupStartsAt ? "text-foreground" : "text-muted-foreground"}>
                {setupStartsAt || "ריק"}
              </span>
              <Button
                aria-label="עריכת הקמה"
                className="absolute end-2 top-1/2 h-6 w-6 -translate-y-1/2"
                onClick={() => setEditingSetup(true)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="eventStartsAt">
            תחילת אירוע <span className="text-destructive">*</span>
          </label>
          {editingEventStart ? (
            <Input
              className="[direction:ltr] text-start"
              id="eventStartsAt"
              onBlur={() => setEditingEventStart(false)}
              onChange={(event) => setEventStartsAt(event.target.value)}
              required
              type="datetime-local"
              value={eventStartsAt}
            />
          ) : (
            <div className="relative rounded-[var(--radius)] border border-border/90 bg-input px-3 py-2 pe-10 text-sm">
              <span className={eventStartsAt ? "text-foreground" : "text-muted-foreground"}>
                {eventStartsAt || "ריק"}
              </span>
              <Button
                aria-label="עריכת תחילת אירוע"
                className="absolute end-2 top-1/2 h-6 w-6 -translate-y-1/2"
                onClick={() => setEditingEventStart(true)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="eventEndsAt">
            סיום אירוע
          </label>
          {editingEventEnd ? (
            <Input
              className="[direction:ltr] text-start"
              id="eventEndsAt"
              onBlur={() => setEditingEventEnd(false)}
              onChange={(event) => setEventEndsAt(event.target.value)}
              type="datetime-local"
              value={eventEndsAt}
            />
          ) : (
            <div className="relative rounded-[var(--radius)] border border-border/90 bg-input px-3 py-2 pe-10 text-sm">
              <span className={eventEndsAt ? "text-foreground" : "text-muted-foreground"}>
                {eventEndsAt || "ריק"}
              </span>
              <Button
                aria-label="עריכת סיום אירוע"
                className="absolute end-2 top-1/2 h-6 w-6 -translate-y-1/2"
                onClick={() => setEditingEventEnd(true)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="teardownAt">
            פירוק
          </label>
          {editingTeardown ? (
            <Input
              className="[direction:ltr] text-start"
              id="teardownAt"
              onBlur={() => setEditingTeardown(false)}
              onChange={(event) => setTeardownAt(event.target.value)}
              type="datetime-local"
              value={teardownAt}
            />
          ) : (
            <div className="relative rounded-[var(--radius)] border border-border/90 bg-input px-3 py-2 pe-10 text-sm">
              <span className={teardownAt ? "text-foreground" : "text-muted-foreground"}>
                {teardownAt || "ריק"}
              </span>
              <Button
                aria-label="עריכת פירוק"
                className="absolute end-2 top-1/2 h-6 w-6 -translate-y-1/2"
                onClick={() => setEditingTeardown(true)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      {state && !state.success ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p>
      ) : null}
      <div className="flex justify-end">
        <Button disabled={isPending} type="submit" variant="outline">
          {isPending ? "שומרים…" : "שמור שינויים"}
        </Button>
      </div>
    </form>
  );
}
