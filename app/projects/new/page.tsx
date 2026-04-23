import Link from "next/link";
import { ArrowRightCircle } from "lucide-react";

import { HeaderInfoModal } from "@/components/common/header-info-modal";
import { listClientsForSelect } from "@/actions/clients";
import { NewProjectForm } from "@/components/projects/new-project-form";
import { PublicInquiryLinkPanel } from "@/components/projects/public-inquiry-link-panel";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const clients = await listClientsForSelect();

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">פרויקט חדש</h1>
          <HeaderInfoModal label="הנחיות פרויקט חדש">
            <p>יצירת פרויקט במצב הצעה (טיוטה) עם לקוח ותאריכי אירוע.</p>
          </HeaderInfoModal>
        </div>
        <Button asChild variant="outline">
          <Link className="inline-flex items-center gap-1.5" href="/projects">
            <ArrowRightCircle className="h-4 w-4" />
            חזרה לרשימה
          </Link>
        </Button>
      </div>

      {clients.length === 0 ? (
        <div className="mb-6 rounded-[var(--radius)] border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          אין לקוחות במערכת. השתמשו בטופס &quot;לקוח חדש&quot; למטה לפני שמירת הפרויקט.
        </div>
      ) : null}

      <PublicInquiryLinkPanel />

      <NewProjectForm initialClients={clients} />
    </main>
  );
}
