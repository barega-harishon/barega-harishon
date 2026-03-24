"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createClient, lookupExistingClient, type ClientLookupCandidate } from "@/actions/clients";
import type { ClientOption } from "@/actions/clients";
import { createProjectFromForm } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { cn } from "@/utils/cn";

const selectClassName =
  "flex h-10 w-full rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

interface NewProjectFormProps {
  initialClients: ClientOption[];
}

export function NewProjectForm({ initialClients }: NewProjectFormProps) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [showNewClient, setShowNewClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientPending, startClientTransition] = useTransition();
  const [quickClientName, setQuickClientName] = useState("");
  const [quickClientPhone, setQuickClientPhone] = useState("");
  const [quickClientEmail, setQuickClientEmail] = useState("");
  const [quickClientAddress, setQuickClientAddress] = useState("");
  const [quickClientNationalId, setQuickClientNationalId] = useState("");
  const [lookupCandidates, setLookupCandidates] = useState<ClientLookupCandidate[]>([]);
  const [selectedLookupId, setSelectedLookupId] = useState<string>("");
  const [lookupOpen, setLookupOpen] = useState(false);
  const [autofillLocked, setAutofillLocked] = useState(false);
  const [manualEditEnabled, setManualEditEnabled] = useState(false);
  const lookupReqRef = useRef(0);

  const [projectState, projectAction, projectPending] = useActionState(
    createProjectFromForm,
    null,
  );

  useEffect(() => {
    if (projectState?.success && projectState.data?.id) {
      router.push(`/projects/${projectState.data.id}`);
    }
  }, [projectState, router]);

  function handleQuickClientSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    startClientTransition(async () => {
      const result = await createClient({
        name: quickClientName,
        phone: quickClientPhone,
        email: quickClientEmail,
        address: quickClientAddress,
        nationalId: quickClientNationalId,
      });

      if (result.success && result.data) {
        setClients((prev) => [
          ...prev,
          { id: result.data!.id, name: result.data!.name },
        ]);
        setShowNewClient(false);
        setClientError(null);
        form.reset();
        setQuickClientName("");
        setQuickClientPhone("");
        setQuickClientEmail("");
        setQuickClientAddress("");
        setQuickClientNationalId("");
        setAutofillLocked(false);
        setManualEditEnabled(false);
      } else {
        setClientError(result.message);
      }
    });
  }

  function applyCandidate(c: ClientLookupCandidate) {
    setQuickClientName(c.name ?? "");
    setQuickClientPhone(c.phone ?? "");
    setQuickClientEmail(c.email ?? "");
    setQuickClientAddress(c.address ?? "");
    setQuickClientNationalId(c.national_id ?? "");
    setAutofillLocked(true);
    setManualEditEnabled(false);
    setLookupOpen(false);
  }

  useEffect(() => {
    if (!showNewClient) {
      return;
    }
    const lookupKey = `${quickClientNationalId.trim()}|${quickClientPhone.trim()}|${quickClientEmail
      .trim()
      .toLowerCase()}`;
    if (!lookupKey.replace(/\|/g, "")) {
      return;
    }
    const t = window.setTimeout(async () => {
      const reqId = ++lookupReqRef.current;
      const { matches } = await lookupExistingClient({
        nationalId: quickClientNationalId,
        phone: quickClientPhone,
        email: quickClientEmail,
        source: "new-project",
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
  }, [showNewClient, quickClientNationalId, quickClientPhone, quickClientEmail]);

  return (
    <div className="space-y-8">
      <section className="rounded-[var(--radius)] border border-border bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">לקוח</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setShowNewClient((v) => {
                const next = !v;
                if (next) {
                  setAutofillLocked(false);
                  setManualEditEnabled(false);
                }
                return next;
              })
            }
          >
            {showNewClient ? "סגירת טופס לקוח" : "לקוח חדש"}
          </Button>
        </div>

        {showNewClient ? (
          <form
            id="quick-client-form"
            className="space-y-4 border-t border-border pt-4"
            onSubmit={handleQuickClientSubmit}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="qc-name">
                  שם לקוח
                </label>
                <Input
                  id="qc-name"
                  name="name"
                  disabled={autofillLocked && !manualEditEnabled}
                  onChange={(e) => setQuickClientName(e.target.value)}
                  required
                  placeholder="שם חברה / איש קשר"
                  value={quickClientName}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="qc-phone">
                  טלפון
                </label>
                <Input
                  id="qc-phone"
                  name="phone"
                  onChange={(e) => setQuickClientPhone(e.target.value)}
                  placeholder="050-0000000"
                  type="tel"
                  value={quickClientPhone}
                  disabled={autofillLocked && !manualEditEnabled}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="qc-email">
                  דוא״ל
                </label>
                <Input
                  id="qc-email"
                  name="email"
                  onChange={(e) => setQuickClientEmail(e.target.value)}
                  type="email"
                  placeholder="אופציונלי"
                  value={quickClientEmail}
                  disabled={autofillLocked && !manualEditEnabled}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="qc-national-id">
                  ח״פ / ת״ז
                </label>
                <Input
                  id="qc-national-id"
                  inputMode="numeric"
                  name="nationalId"
                  onChange={(e) => setQuickClientNationalId(e.target.value)}
                  placeholder="אופציונלי"
                  value={quickClientNationalId}
                  disabled={autofillLocked && !manualEditEnabled}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="qc-address">
                  כתובת
                </label>
                <Input
                  id="qc-address"
                  name="address"
                  onChange={(e) => setQuickClientAddress(e.target.value)}
                  placeholder="כתובת לחשבונית / קשר"
                  value={quickClientAddress}
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
              <p className="text-sm text-destructive">{clientError}</p>
            ) : null}
            <Button disabled={clientPending} type="submit" variant="outline">
              {clientPending ? "שומרים…" : "שמירת לקוח"}
            </Button>
          </form>
        ) : null}
        <Modal onOpenChange={setLookupOpen} open={lookupOpen}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>נמצא לקוח קיים</ModalTitle>
              <ModalDescription>
                האם זה אותו לקוח? אם תאשר, נמלא את הפרטים אוטומטית.
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
                לא, זה לקוח אחר
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

        <form action={projectAction} className={cn("space-y-4", showNewClient && "mt-6")}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="clientId">
              בחירת לקוח לפרויקט
            </label>
            <select
              required
              className={selectClassName}
              defaultValue=""
              id="clientId"
              name="clientId"
            >
              <option disabled value="">
                בחרו לקוח מהרשימה
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="locationAddress">
              כתובת האירוע
            </label>
            <Input
              id="locationAddress"
              name="locationAddress"
              placeholder="כתובת השטח / האולם"
            />
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
                תאריך ושעת תחילת אירוע
              </label>
              <Input id="eventStartsAt" name="eventStartsAt" type="datetime-local" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="eventEndsAt">
                תאריך ושעת סיום אירוע
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

          {projectState && !projectState.success ? (
            <p className="text-sm text-destructive">{projectState.message}</p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <Button disabled={projectPending} type="submit">
              {projectPending ? "יוצרים פרויקט…" : "יצירת פרויקט טיוטה"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
