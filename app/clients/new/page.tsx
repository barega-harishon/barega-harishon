import Link from "next/link";
import { ArrowRightCircle } from "lucide-react";

import { HeaderInfoModal } from "@/components/common/header-info-modal";
import { NewClientForm } from "@/components/clients/new-client-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { isOfficeOrAdminRole } from "@/types/app-role";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  const roles = await getCurrentAppRoles();
  const canCreate = isOfficeOrAdminRole(roles);

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">לקוח חדש</h1>
          <HeaderInfoModal label="הנחיות לקוח חדש">
            <p>הוספת לקוח למאגר לפני או אחרי פתיחת פרויקט.</p>
          </HeaderInfoModal>
        </div>
        <Button asChild variant="outline">
          <Link className="inline-flex items-center gap-1.5" href="/clients">
            <ArrowRightCircle className="h-4 w-4" />
            חזרה לרשימה
          </Link>
        </Button>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>פרטי לקוח</CardTitle>
          <CardDescription>
            {canCreate
              ? "שמירה לפי הרשאות משרד/אדמין (RLS)."
              : "אין הרשאה להוסיף לקוח. פנו למשרד או למנהל מערכת."}
          </CardDescription>
        </CardHeader>
        <CardContent>{canCreate ? <NewClientForm /> : null}</CardContent>
      </Card>
    </main>
  );
}
