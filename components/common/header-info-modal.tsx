import type { ReactNode } from "react";
import { Info } from "lucide-react";

import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";

interface HeaderInfoModalProps {
  label: string;
  title?: string;
  children: ReactNode;
}

export function HeaderInfoModal({ label, title = "הנחיות", children }: HeaderInfoModalProps) {
  return (
    <Modal>
      <ModalTrigger
        aria-label={label}
        className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        type="button"
      >
        <Info className="h-4 w-4" />
      </ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
        </ModalHeader>
        <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
      </ModalContent>
    </Modal>
  );
}
