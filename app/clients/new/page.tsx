import Link from "next/link";

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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">לקוח חדש</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            הוספת לקוח למאגר לפני או אחרי פתיחת פרויקט.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/clients">חזרה לרשימה</Link>
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
