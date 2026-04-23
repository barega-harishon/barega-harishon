"use client";

import Link from "next/link";
import { CalendarDays, Download, FileSpreadsheet, FileUp, PlusCircle } from "lucide-react";

import { EquipmentImportForm } from "@/components/equipment/equipment-import-form";
import { NewEquipmentForm } from "@/components/equipment/new-equipment-form";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";

export function EquipmentToolbarActions() {
  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
      <Modal>
        <ModalTrigger asChild>
          <Button className="w-full sm:w-auto" size="sm" type="button" variant="outline">
            <PlusCircle className="me-1 h-4 w-4" />
            הוספת פרטים
          </Button>
        </ModalTrigger>
        <ModalContent className="w-[min(96vw,64rem)]">
          <ModalHeader>
            <ModalTitle>הוספת פרטים</ModalTitle>
          </ModalHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-[var(--radius)] border border-border p-3">
              <p className="inline-flex items-center gap-2 text-sm font-medium">
                <PlusCircle className="h-4 w-4 text-muted-foreground" />
                הוספת פריט
              </p>
              <NewEquipmentForm />
            </div>
            <div className="space-y-2 rounded-[var(--radius)] border border-border p-3">
              <p className="inline-flex items-center gap-2 text-sm font-medium">
                <FileUp className="h-4 w-4 text-muted-foreground" />
                ייבוא אקסל
              </p>
              <EquipmentImportForm />
              <Button asChild size="sm" type="button" variant="outline">
                <Link className="inline-flex items-center gap-1.5" href="/api/equipment/template">
                  <Download className="h-4 w-4" />
                  הורדת תבנית אקסל
                </Link>
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      <Modal>
        <ModalTrigger asChild>
          <Button className="w-full sm:w-auto" size="sm" type="button" variant="outline">
            <Download className="me-1 h-4 w-4" />
            הורדת אקסל
          </Button>
        </ModalTrigger>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>הורדת אקסל</ModalTitle>
          </ModalHeader>
          <div className="space-y-2">
            <Button asChild className="w-full justify-start" size="sm" type="button" variant="outline">
              <Link className="inline-flex items-center gap-1.5" href="/api/equipment/export?kind=company">
                <Download className="h-4 w-4" />
                הורדת אקסל של כל המלאי
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" size="sm" type="button" variant="outline">
              <Link className="inline-flex items-center gap-1.5" href="/api/equipment/export?kind=realtime">
                <Download className="h-4 w-4" />
                הורדת אקסל של המלאי בזמן נוכחי
              </Link>
            </Button>
            <form action="/api/equipment/export" className="flex flex-wrap items-end gap-2" method="get">
              <input name="kind" type="hidden" value="by-date" />
              <label className="text-xs text-muted-foreground" htmlFor="export-date">
                ציוד לפי תאריך
              </label>
              <input
                className="h-9 rounded-md border border-border bg-input px-2 text-sm"
                id="export-date"
                name="date"
                required
                type="date"
              />
              <Button size="sm" type="submit" variant="outline">
                <Download className="me-1 h-4 w-4" />
                הורדה
              </Button>
            </form>
          </div>
        </ModalContent>
      </Modal>
      </div>

      <div className="grid w-full grid-cols-2 gap-2 sm:ms-auto sm:flex sm:w-auto sm:flex-wrap sm:items-center">
        <Button asChild className="w-full sm:w-auto" size="sm" type="button" variant="outline">
          <Link className="inline-flex items-center gap-1.5" href="/equipment/picking">
            <FileSpreadsheet className="h-4 w-4" />
            ליקוט מחסן
          </Link>
        </Button>
        <Button asChild className="w-full sm:w-auto" size="sm" type="button" variant="outline">
          <Link className="inline-flex items-center gap-1.5" href="/equipment/count">
            <CalendarDays className="h-4 w-4" />
            ספירת מלאי
          </Link>
        </Button>
      </div>
    </div>
  );
}
