"use client";

import Link from "next/link";
import { useActionState } from "react";

import { submitPublicInquiryFromForm } from "@/actions/public-inquiry";
import type { ActionResult } from "@/types/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function PublicInquiryForm() {
  const [state, action, pending] = useActionState(
    submitPublicInquiryFromForm,
    null as ActionResult<{ projectId: string; trackingToken: string | null }> | null,
  );

  if (state?.success && state.data?.projectId) {
    const trackHref = state.data.trackingToken
      ? `/track/${state.data.trackingToken}`
      : null;
    return (
      <div className="rounded-[var(--radius)] border border-border bg-muted/30 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">{state.message}</p>
        {trackHref ? (
          <p className="mt-4 text-sm text-muted-foreground">
            ניתן לעקוב אחרי סטטוס האירוע בקישור האישי שלכם (שמרו אותו):
          </p>
        ) : null}
        {trackHref ? (
          <p className="mt-2">
            <Link
              className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              href={trackHref}
            >
              דף מעקב האירוע
            </Link>
          </p>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          סימוכין פנימי:{" "}
          <code className="rounded bg-muted px-1" dir="ltr">
            {state.data.projectId.slice(0, 8)}…
          </code>
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="relative space-y-8">
      {/* honeypot – בוטים */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor="company">חברה</label>
        <input autoComplete="off" defaultValue="" id="company" name="company" tabIndex={-1} type="text" />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">פרטי קשר</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="clientName">
              שם מלא <span className="text-destructive">*</span>
            </label>
            <Input id="clientName" name="clientName" required type="text" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="clientPhone">
              טלפון
            </label>
            <Input id="clientPhone" name="clientPhone" type="tel" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="clientEmail">
              דוא״ל
            </label>
            <Input id="clientEmail" name="clientEmail" type="email" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="clientAddress">
              כתובת (אופציונלי)
            </label>
            <Input id="clientAddress" name="clientAddress" type="text" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">נא למלא לפחות טלפון או דוא״ל.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">פרטי האירוע</h2>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="eventAddress">
            כתובת האירוע <span className="text-destructive">*</span>
          </label>
          <Input id="eventAddress" name="eventAddress" required type="text" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="setupStartsAt">
              תאריך ושעת הקמה
            </label>
            <Input id="setupStartsAt" name="setupStartsAt" type="datetime-local" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="eventStartsAt">
              תחילת האירוע <span className="text-destructive">*</span>
            </label>
            <Input id="eventStartsAt" name="eventStartsAt" required type="datetime-local" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="eventEndsAt">
              סיום האירוע
            </label>
            <Input id="eventEndsAt" name="eventEndsAt" type="datetime-local" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="teardownAt">
              תאריך ושעת פירוק
            </label>
            <Input id="teardownAt" name="teardownAt" type="datetime-local" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">שטח והערות</h2>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="accessNotes">
            דרכי גישה
          </label>
          <Textarea id="accessNotes" name="accessNotes" rows={3} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="claddingColor">
            צבע חיפוי
          </label>
          <Input id="claddingColor" name="claddingColor" type="text" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="notes">
            הערות נוספות
          </label>
          <Textarea id="notes" name="notes" rows={3} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">קבצים (אופציונלי)</h2>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="photos">
            תמונות השטח (עד 8 קבצים, עד 5MB כל אחת)
          </label>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-muted-foreground file:me-4 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            id="photos"
            multiple
            name="photos"
            type="file"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="sketch">
            סקיצה (תמונה או PDF, עד 8MB)
          </label>
          <input
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="block w-full text-sm text-muted-foreground file:me-4 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            id="sketch"
            name="sketch"
            type="file"
          />
        </div>
      </section>

      {state && !state.success ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button disabled={pending} size="lg" type="submit">
          {pending ? "שולחים…" : "שליחת פנייה"}
        </Button>
      </div>
    </form>
  );
}
