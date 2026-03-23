"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/actions/clients";
import type { ClientOption } from "@/actions/clients";
import { createProjectFromForm } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    const formData = new FormData(form);

    startClientTransition(async () => {
      const result = await createClient({
        name: formData.get("name"),
        phone: formData.get("phone"),
        email: formData.get("email"),
        address: formData.get("address"),
      });

      if (result.success && result.data) {
        setClients((prev) => [
          ...prev,
          { id: result.data!.id, name: result.data!.name },
        ]);
        setShowNewClient(false);
        setClientError(null);
        form.reset();
      } else {
        setClientError(result.message);
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[var(--radius)] border border-border bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">לקוח</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowNewClient((v) => !v)}
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
                  required
                  placeholder="שם חברה / איש קשר"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="qc-phone">
                  טלפון
                </label>
                <Input id="qc-phone" name="phone" type="tel" placeholder="050-0000000" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="qc-email">
                  דוא״ל
                </label>
                <Input
                  id="qc-email"
                  name="email"
                  type="email"
                  placeholder="אופציונלי"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="qc-address">
                  כתובת
                </label>
                <Input
                  id="qc-address"
                  name="address"
                  placeholder="כתובת לחשבונית / קשר"
                />
              </div>
            </div>
            {clientError ? (
              <p className="text-sm text-destructive">{clientError}</p>
            ) : null}
            <Button disabled={clientPending} type="submit" variant="outline">
              {clientPending ? "שומרים…" : "שמירת לקוח"}
            </Button>
          </form>
        ) : null}

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
