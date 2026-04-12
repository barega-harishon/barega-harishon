"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { lookupExistingClient, type ClientLookupCandidate } from "@/actions/clients";
import { submitPublicInquiryFromForm } from "@/actions/public-inquiry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/types/common";
import { CladdingSwatchGroup } from "@/components/inquiry/cladding-swatch-group";

export function PublicInquiryForm() {
  const [state, action, pending] = useActionState(
    submitPublicInquiryFromForm,
    null as ActionResult<{ projectId: string; trackingToken: string | null }> | null,
  );
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [setupStartsAt, setSetupStartsAt] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventEndsAt, setEventEndsAt] = useState("");
  const [teardownAt, setTeardownAt] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [sketch, setSketch] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [lookupCandidates, setLookupCandidates] = useState<ClientLookupCandidate[]>([]);
  const [selectedLookupId, setSelectedLookupId] = useState<string>("");
  const [lookupOpen, setLookupOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [autofillLocked, setAutofillLocked] = useState(false);
  const [manualEditEnabled, setManualEditEnabled] = useState(false);
  const [carpetCladdingColor, setCarpetCladdingColor] = useState("");
  const [fabricCladdingColor, setFabricCladdingColor] = useState("");
  const lookupReqRef = useRef(0);

  const totalPhotoMb = useMemo(
    () => photos.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024),
    [photos],
  );

  function validateClient() {
    if (!clientPhone.trim()) {
      setClientError("נא למלא מספר טלפון.");
      return false;
    }
    if (!clientEmail.trim()) {
      setClientError("נא למלא דוא״ל.");
      return false;
    }
    if (!nationalId.trim()) {
      setClientError("נא למלא מספר זהות או ח״פ.");
      return false;
    }
    if (nationalId.replace(/\D/g, "").length < 5) {
      setClientError("נא למלא לפחות 5 ספרות במספר הזהות או בח״פ.");
      return false;
    }
    setClientError(null);
    return true;
  }

  function validateDates() {
    if (!setupStartsAt.trim()) {
      setDateError("נא לבחור תאריך ושעת הקמה.");
      return false;
    }
    if (!teardownAt.trim()) {
      setDateError("נא לבחור תאריך ושעת פירוק.");
      return false;
    }
    const setup = setupStartsAt ? new Date(setupStartsAt).getTime() : null;
    const start = eventStartsAt ? new Date(eventStartsAt).getTime() : null;
    const end = eventEndsAt ? new Date(eventEndsAt).getTime() : null;
    const tear = teardownAt ? new Date(teardownAt).getTime() : null;

    if (setup && start && setup > start) {
      setDateError("תאריך הקמה חייב להיות לפני תחילת האירוע.");
      return false;
    }
    if (start && end && start > end) {
      setDateError("תחילת האירוע חייבת להיות לפני סיום האירוע.");
      return false;
    }
    if (end && tear && end > tear) {
      setDateError("סיום האירוע חייב להיות לפני זמן הפירוק.");
      return false;
    }
    if (start && tear && start > tear) {
      setDateError("תחילת האירוע חייבת להיות לפני זמן הפירוק.");
      return false;
    }
    setDateError(null);
    return true;
  }

  function validateFiles(nextPhotos: File[], nextSketch: File | null) {
    if (nextPhotos.length > 8) {
      setFilesError("אפשר להעלות עד 8 תמונות.");
      return false;
    }
    for (const p of nextPhotos) {
      if (p.size > 5 * 1024 * 1024) {
        setFilesError(`התמונה "${p.name}" גדולה מ־5MB.`);
        return false;
      }
    }
    if (nextSketch && nextSketch.size > 8 * 1024 * 1024) {
      setFilesError("קובץ הסקיצה גדול מ־8MB.");
      return false;
    }
    setFilesError(null);
    return true;
  }

  function onSubmitValidate() {
    const okClient = validateClient();
    const okDates = validateDates();
    const okFiles = validateFiles(photos, sketch);
    return okClient && okDates && okFiles;
  }

  function applyCandidate(c: ClientLookupCandidate) {
    setClientName(c.name ?? "");
    setClientPhone(c.phone ?? "");
    setClientEmail(c.email ?? "");
    setClientAddress(c.address ?? "");
    setNationalId(c.national_id ?? "");
    setAutofillLocked(true);
    setManualEditEnabled(false);
    setLookupOpen(false);
  }

  useEffect(() => {
    const lookupKey = `${nationalId.trim()}|${clientPhone.trim()}|${clientEmail.trim().toLowerCase()}`;
    if (!lookupKey.replace(/\|/g, "")) {
      return;
    }
    const t = window.setTimeout(async () => {
      const reqId = ++lookupReqRef.current;
      const { matches } = await lookupExistingClient({
        nationalId,
        phone: clientPhone,
        email: clientEmail,
        source: "public-inquiry",
      });
      if (reqId !== lookupReqRef.current) {
        return;
      }
      if (matches.length > 0) {
        setLookupCandidates(matches);
        setSelectedLookupId(matches[0]?.id ?? "");
        setLookupOpen(true);
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [nationalId, clientPhone, clientEmail]);

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
    <form
      action={action}
      className="relative space-y-8"
      onSubmit={(e) => {
        if (!onSubmitValidate()) {
          e.preventDefault();
        }
      }}
    >
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
            <Input
              autoComplete="name"
              id="clientName"
              name="clientName"
              disabled={autofillLocked && !manualEditEnabled}
              onChange={(e) => setClientName(e.target.value)}
              required
              type="text"
              value={clientName}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="clientPhone">
              טלפון <span className="text-destructive">*</span>
            </label>
            <Input
              autoComplete="tel"
              id="clientPhone"
              inputMode="tel"
              name="clientPhone"
              onBlur={() => {
                validateClient();
              }}
              onChange={(e) => setClientPhone(e.target.value)}
              required
              type="tel"
              value={clientPhone}
              disabled={autofillLocked && !manualEditEnabled}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="clientEmail">
              דוא״ל <span className="text-destructive">*</span>
            </label>
            <Input
              autoComplete="email"
              id="clientEmail"
              inputMode="email"
              name="clientEmail"
              onBlur={() => {
                validateClient();
              }}
              onChange={(e) => setClientEmail(e.target.value)}
              required
              type="email"
              value={clientEmail}
              disabled={autofillLocked && !manualEditEnabled}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="nationalId">
              ח״פ / ת״ז <span className="text-destructive">*</span>
            </label>
            <Input
              id="nationalId"
              inputMode="numeric"
              name="nationalId"
              onChange={(e) => setNationalId(e.target.value)}
              required
              value={nationalId}
              disabled={autofillLocked && !manualEditEnabled}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="clientAddress">
              כתובת (אופציונלי)
            </label>
            <Input
              autoComplete="street-address"
              id="clientAddress"
              name="clientAddress"
              onChange={(e) => setClientAddress(e.target.value)}
              type="text"
              value={clientAddress}
              disabled={autofillLocked && !manualEditEnabled}
            />
          </div>
        </div>
        {autofillLocked ? (
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input
              checked={manualEditEnabled}
              onChange={(e) => setManualEditEnabled(e.target.checked)}
              type="checkbox"
            />
            עריכה ידנית של פרטי לקוח מזוהה
          </label>
        ) : null}
        {clientError ? (
          <p aria-live="polite" className="text-xs text-destructive">
            {clientError}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">טלפון, דוא״ל ומספר זהות או ח״פ — חובה.</p>
        )}
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
              תאריך ושעת הקמה <span className="text-destructive">*</span>
            </label>
            <Input
              id="setupStartsAt"
              name="setupStartsAt"
              onBlur={validateDates}
              onChange={(e) => setSetupStartsAt(e.target.value)}
              required
              type="datetime-local"
              value={setupStartsAt}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="eventStartsAt">
              תחילת האירוע <span className="text-destructive">*</span>
            </label>
            <Input
              id="eventStartsAt"
              name="eventStartsAt"
              onBlur={validateDates}
              onChange={(e) => setEventStartsAt(e.target.value)}
              required
              type="datetime-local"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="eventEndsAt">
              סיום האירוע
            </label>
            <Input
              id="eventEndsAt"
              name="eventEndsAt"
              onBlur={validateDates}
              onChange={(e) => setEventEndsAt(e.target.value)}
              type="datetime-local"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="teardownAt">
              תאריך ושעת פירוק <span className="text-destructive">*</span>
            </label>
            <Input
              id="teardownAt"
              name="teardownAt"
              onBlur={validateDates}
              onChange={(e) => setTeardownAt(e.target.value)}
              required
              type="datetime-local"
              value={teardownAt}
            />
          </div>
        </div>
        {dateError ? (
          <p aria-live="polite" className="text-xs text-destructive">
            {dateError}
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">שטח והערות</h2>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="accessNotes">
            דרכי גישה
          </label>
          <Textarea id="accessNotes" name="accessNotes" rows={3} />
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
            onChange={(e) => {
              const next = Array.from(e.target.files ?? []);
              setPhotos(next);
              validateFiles(next, sketch);
            }}
            type="file"
          />
          {photos.length > 0 ? (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>נבחרו {photos.length} תמונות (סה״כ {totalPhotoMb.toFixed(1)}MB)</p>
              {photos.map((f) => (
                <p key={`${f.name}-${f.size}`}>- {f.name}</p>
              ))}
            </div>
          ) : null}
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
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null;
              setSketch(next);
              validateFiles(photos, next);
            }}
            type="file"
          />
          {sketch ? (
            <p className="text-xs text-muted-foreground">
              נבחרה סקיצה: {sketch.name} ({(sketch.size / (1024 * 1024)).toFixed(1)}MB)
            </p>
          ) : null}
        </div>
        {filesError ? (
          <p aria-live="polite" className="text-xs text-destructive">
            {filesError}
          </p>
        ) : null}
      </section>

      {state && !state.success ? (
        <p aria-live="assertive" className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button disabled={pending} size="lg" type="submit">
          {pending ? "שולחים…" : "שליחת פנייה"}
        </Button>
      </div>

      <Modal onOpenChange={setLookupOpen} open={lookupOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>נמצא לקוח קיים</ModalTitle>
            <ModalDescription>
              האם זה הלקוח שברצונך להשתמש בפרטיו?
            </ModalDescription>
          </ModalHeader>
          {lookupCandidates.length > 0 ? (
            <div className="space-y-1 text-sm">
              {lookupCandidates.length > 1 ? (
                <div className="space-y-2">
                  <p>נמצאו כמה לקוחות מתאימים. בחרו אחד:</p>
                  <select
                    className="flex h-10 w-full rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm"
                    onChange={(e) => setSelectedLookupId(e.target.value)}
                    value={selectedLookupId}
                  >
                    {lookupCandidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} | {c.phone ?? "ללא טלפון"} | {c.email ?? "ללא אימייל"}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {(() => {
                const selected =
                  lookupCandidates.find((c) => c.id === selectedLookupId) ?? lookupCandidates[0];
                if (!selected) {
                  return null;
                }
                return (
                  <div className="space-y-1">
                    <p><strong>שם:</strong> {selected.name}</p>
                    <p><strong>טלפון:</strong> {selected.phone ?? "—"}</p>
                    <p><strong>דוא״ל:</strong> {selected.email ?? "—"}</p>
                    <p><strong>כתובת:</strong> {selected.address ?? "—"}</p>
                  </div>
                );
              })()}
            </div>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => setLookupOpen(false)} type="button" variant="outline">
              לא, המשך ידנית
            </Button>
            <Button
              onClick={() => {
                const selected =
                  lookupCandidates.find((c) => c.id === selectedLookupId) ?? lookupCandidates[0];
                if (selected) {
                  applyCandidate(selected);
                }
              }}
              type="button"
            >
              כן, זה הלקוח
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </form>
  );
}
