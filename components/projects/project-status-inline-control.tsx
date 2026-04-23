"use client";

import { useActionState, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  approveIncomingProjectRequestFromForm,
  updateProjectStatusFromForm,
} from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import type { ProjectStatus } from "@/types/projects";
import {
  PROJECT_STATUS_FIELD_TARGET_ORDER,
  PROJECT_STATUS_KANBAN_ORDER,
  PROJECT_STATUS_LABELS,
} from "@/types/projects";

interface ProjectStatusInlineControlProps {
  projectId: string;
  currentStatus: ProjectStatus;
  isFieldUser: boolean;
  canApproveIncoming?: boolean;
}

export function ProjectStatusInlineControl({
  projectId,
  currentStatus,
  isFieldUser,
  canApproveIncoming = false,
}: ProjectStatusInlineControlProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(updateProjectStatusFromForm, null);
  const [approveState, approveAction, isApprovePending] = useActionState(
    approveIncomingProjectRequestFromForm,
    null,
  );
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus>(currentStatus);
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (state?.success || approveState?.success) {
      router.refresh();
    }
  }, [approveState?.success, router, state?.success]);

  const statuses = isFieldUser ? PROJECT_STATUS_FIELD_TARGET_ORDER : PROJECT_STATUS_KANBAN_ORDER;
  const defaultStatus = statuses.includes(currentStatus) ? currentStatus : statuses[0];

  useEffect(() => {
    setSelectedStatus(defaultStatus);
  }, [defaultStatus]);

  function handleSelectChange(value: string) {
    if (!value) {
      return;
    }
    const next = value as ProjectStatus;
    if (next === currentStatus) {
      return;
    }
    setPendingStatus(next);
    setConfirmOpen(true);
  }

  function handleConfirm() {
    if (!pendingStatus) {
      return;
    }
    setSelectedStatus(pendingStatus);
    setConfirmOpen(false);
    setPendingStatus(null);
    formRef.current?.requestSubmit();
  }

  function handleCancel() {
    setConfirmOpen(false);
    setPendingStatus(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={formAction} className="relative" ref={formRef}>
        <input name="projectId" type="hidden" value={projectId} />
        <input name="status" type="hidden" value={selectedStatus} />
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              aria-label="בחירת סטטוס פרויקט"
              className="h-8 min-w-[8.2rem] appearance-none rounded-full border border-border bg-card px-3 pe-8 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              defaultValue=""
              disabled={isPending}
              onChange={(event) => {
                handleSelectChange(event.currentTarget.value);
                event.currentTarget.value = "";
              }}
            >
              <option value="">לשינוי הסטטוס</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {PROJECT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </form>

      {canApproveIncoming && currentStatus === "incoming" ? (
        <form action={approveAction}>
          <input name="projectId" type="hidden" value={projectId} />
          <Button
            className="h-8 rounded-full px-2.5"
            disabled={isApprovePending}
            size="sm"
            type="submit"
            variant="outline"
          >
            <Check className="h-3.5 w-3.5" />
            אשר
          </Button>
        </form>
      ) : null}

      {state && !state.success ? <p className="w-full text-xs text-destructive">{state.message}</p> : null}
      {approveState && !approveState.success ? (
        <p className="w-full text-xs text-destructive">{approveState.message}</p>
      ) : null}

      <Modal onOpenChange={setConfirmOpen} open={confirmOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>אישור שינוי סטטוס</ModalTitle>
          </ModalHeader>
          <p className="text-sm text-muted-foreground">
            האם לעדכן את הסטטוס ל־
            <span className="font-medium text-foreground"> {pendingStatus ? PROJECT_STATUS_LABELS[pendingStatus] : "—"}</span>
            ?
          </p>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button onClick={handleCancel} type="button" variant="ghost">
              ביטול
            </Button>
            <Button disabled={isPending} onClick={handleConfirm} type="button">
              {isPending ? "מעדכנים..." : "אישור"}
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
