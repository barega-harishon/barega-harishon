"use client";

import { useMemo, useState, useTransition } from "react";

import { removeEmployeeFile } from "@/actions/employees";
import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal";

export type EmployeeFileLink = {
  path: string;
  name: string;
  url: string;
};

type Props = {
  employeeId: string;
  documents: EmployeeFileLink[];
  licenses: EmployeeFileLink[];
};

export function EmployeeFilesCell({ employeeId, documents, licenses }: Props) {
  const [isPending, startTransition] = useTransition();
  const [docs, setDocs] = useState(documents);
  const [lics, setLics] = useState(licenses);
  const [preview, setPreview] = useState<EmployeeFileLink | null>(null);

  const hasFiles = docs.length > 0 || lics.length > 0;
  const totalLabel = useMemo(() => `מסמכים ${docs.length} | רשיונות ${lics.length}`, [docs.length, lics.length]);

  function onDelete(category: "documents" | "licenses", path: string) {
    startTransition(async () => {
      const result = await removeEmployeeFile({ employeeId, category, path });
      if (!result.success) {
        window.alert(result.message);
        return;
      }

      if (category === "documents") {
        setDocs((prev) => prev.filter((f) => f.path !== path));
      } else {
        setLics((prev) => prev.filter((f) => f.path !== path));
      }
    });
  }

  if (!hasFiles) {
    return <span className="text-muted-foreground">—</span>;
  }

  const previewExt = preview?.name.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(previewExt);
  const isPdf = previewExt === "pdf";

  return (
    <Modal open={preview !== null} onOpenChange={(open) => (!open ? setPreview(null) : null)}>
      <div className="space-y-2 py-1">
        <p className="text-xs text-muted-foreground">{totalLabel}</p>

        {docs.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-medium">מסמכים</p>
            {docs.map((f) => (
              <div className="flex items-center justify-between gap-2" key={f.path}>
                <a className="truncate text-xs text-primary underline" href={f.url} target="_blank" rel="noreferrer">
                  {f.name}
                </a>
                <div className="flex items-center gap-1">
                  <ModalTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreview(f)}
                      className="h-7 px-2 text-xs"
                    >
                      תצוגה
                    </Button>
                  </ModalTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => onDelete("documents", f.path)}
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                  >
                    מחיקה
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {lics.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-medium">רשיונות</p>
            {lics.map((f) => (
              <div className="flex items-center justify-between gap-2" key={f.path}>
                <a className="truncate text-xs text-primary underline" href={f.url} target="_blank" rel="noreferrer">
                  {f.name}
                </a>
                <div className="flex items-center gap-1">
                  <ModalTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreview(f)}
                      className="h-7 px-2 text-xs"
                    >
                      תצוגה
                    </Button>
                  </ModalTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => onDelete("licenses", f.path)}
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                  >
                    מחיקה
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <ModalContent className="w-[min(95vw,56rem)] p-4">
        <ModalHeader>
          <ModalTitle>{preview?.name ?? "תצוגת קובץ"}</ModalTitle>
          <ModalDescription>תצוגה מהירה של הקובץ לפני פתיחה בחלון חדש.</ModalDescription>
        </ModalHeader>
        <div className="rounded-md border border-border bg-muted/20 p-2">
          {preview ? (
            isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt={preview.name} className="max-h-[70vh] w-full rounded object-contain" />
            ) : isPdf ? (
              <iframe src={preview.url} title={preview.name} className="h-[70vh] w-full rounded border-0" />
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                אין תצוגה מובנית לסוג קובץ זה. פתחו בחלון חדש.
              </div>
            )
          ) : null}
        </div>
        {preview ? (
          <div className="mt-3 flex justify-end">
            <a className="text-sm text-primary underline" href={preview.url} target="_blank" rel="noreferrer">
              פתיחה בחלון חדש
            </a>
          </div>
        ) : null}
      </ModalContent>
    </Modal>
  );
}
