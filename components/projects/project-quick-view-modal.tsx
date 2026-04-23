"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, MapPin, ReceiptText, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import type { ProjectListRow, ProjectStatus } from "@/types/projects";
import { formatDateTimeByPreference } from "@/utils/date";
import { formatCurrencyIl } from "@/utils/money";

interface ProjectQuickViewModalProps {
  row: ProjectListRow;
  status: ProjectStatus;
  dateStyle: "short" | "hebrew";
  trigger?: ReactNode;
  triggerAsChild?: boolean;
}

export function ProjectQuickViewModal({
  row,
  status,
  dateStyle,
  trigger,
  triggerAsChild = false,
}: ProjectQuickViewModalProps) {
  const clientName = row.clients?.name ?? "—";
  const eventAddress = row.location_address ?? "ללא כתובת";
  const eventStart = formatDateTimeByPreference(row.event_starts_at, dateStyle);
  const totalPrice = formatCurrencyIl(row.total_price);

  return (
    <Modal>
      {trigger ? (
        <ModalTrigger asChild={triggerAsChild}>{trigger}</ModalTrigger>
      ) : (
        <ModalTrigger asChild>
          <Button size="sm" variant="outline">
            פתיחה
          </Button>
        </ModalTrigger>
      )}
      <ModalContent className="w-[min(96vw,34rem)] p-0 sm:w-[min(92vw,36rem)]">
        <ModalHeader className="mb-0">
          <ModalTitle className="border-b border-border px-4 pb-3 pt-4 sm:px-6 sm:pt-6">פרטי פרויקט</ModalTitle>
        </ModalHeader>
        <div className="space-y-4 px-4 pb-4 text-sm sm:px-6 sm:pb-6">
          <section className="space-y-3 rounded-[var(--radius)] border border-border bg-muted/20 p-3">
            <div className="flex items-start gap-2">
              <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">לקוח</p>
                <p className="break-words font-medium">{clientName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">סטטוס</span>
              <ProjectStatusBadge status={status} />
            </div>
          </section>

          <section className="space-y-3 rounded-[var(--radius)] border border-border bg-muted/20 p-3">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">כתובת אירוע</p>
                <p className="break-words font-medium">{eventAddress}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">תחילת אירוע</p>
                <p className="font-medium">{eventStart}</p>
              </div>
            </div>
          </section>

          <section className="space-y-2 rounded-[var(--radius)] border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">סכום כולל</p>
            </div>
            <p className="text-base font-semibold">{totalPrice}</p>
            <p className="text-xs text-muted-foreground">מספר פרויקט: {row.id.slice(0, 8).toUpperCase()}</p>
          </section>

          <div className="sticky bottom-0 -mx-4 border-t border-border bg-card px-4 pt-3 sm:-mx-6 sm:px-6">
            <Button asChild className="w-full sm:w-auto">
              <Link href={`/projects/${row.id}`}>לפרטים מלאים</Link>
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
