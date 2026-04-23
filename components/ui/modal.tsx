import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/utils/cn";

export const Modal = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;
export const ModalClose = Dialog.Close;

export function ModalContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Content>) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/70" />
      <Dialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(95vw,32rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-[var(--radius)] border border-border bg-card p-4 text-card-foreground shadow-xl focus:outline-none sm:p-6",
          className,
        )}
        {...props}
      >
        {children}
        <Dialog.Close className="absolute end-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
          <X className="h-4 w-4" />
          <span className="sr-only">סגור</span>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export const ModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-4 text-right", className)} {...props} />
);

export const ModalTitle = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Title>) => (
  <Dialog.Title className={cn("text-lg font-semibold", className)} {...props} />
);

export const ModalDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("mt-2 text-sm text-muted-foreground", className)} {...props} />
);
