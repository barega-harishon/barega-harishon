"use client";

import { useActionState } from "react";

import { sendQuotePdfByEmailFromForm } from "@/actions/quote-pdf-email";
import type { ActionResult } from "@/types/common";
import { Button } from "@/components/ui/button";

interface ProjectQuoteActionsProps {
  projectId: string;
  showEmail: boolean;
}

export function ProjectQuoteActions({ projectId, showEmail }: ProjectQuoteActionsProps) {
  const [emailState, emailAction, emailPending] = useActionState(
    sendQuotePdfByEmailFromForm,
    null as ActionResult<Record<string, never>> | null,
  );

  return (
    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
      <Button asChild size="sm" variant="outline">
        <a href={`/api/projects/${projectId}/quote-pdf`} rel="noopener noreferrer" target="_blank">
          הורדת הצעת מחיר (PDF)
        </a>
      </Button>
      {showEmail ? (
        <form action={emailAction} className="contents">
          <input name="projectId" type="hidden" value={projectId} />
          <Button disabled={emailPending} size="sm" type="submit" variant="default">
            {emailPending ? "שולחים…" : "שליחת הצעה במייל"}
          </Button>
        </form>
      ) : null}
      {emailState && !emailState.success ? (
        <p className="w-full text-sm text-destructive" role="alert">
          {emailState.message}
        </p>
      ) : null}
      {emailState?.success ? (
        <p className="w-full text-sm text-emerald-700 dark:text-emerald-400">{emailState.message}</p>
      ) : null}
    </div>
  );
}
