import Link from "next/link";
import { notFound } from "next/navigation";

import { getClientById } from "@/actions/clients";
import { listProjects } from "@/actions/projects";
import { EditClientForm } from "@/components/clients/edit-client-form";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { getDateStylePreference } from "@/lib/date-style-server";
import { isOfficeOrAdminRole } from "@/types/app-role";
import type { ProjectStatus } from "@/types/projects";
import { formatDateTimeByPreference } from "@/utils/date";
import { formatCurrencyIl } from "@/utils/money";

export const dynamic = "force-dynamic";

function isProjectStatus(value: string): value is ProjectStatus {
  return (
    value === "incoming" ||
    value === "quote" ||
    value === "approved" ||
    value === "prep" ||
    value === "setup" ||
    value === "teardown" ||
    value === "closed"
  );
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [client, roles, dateStyle] = await Promise.all([
    getClientById(id),
    getCurrentAppRoles(),
    getDateStylePreference(),
  ]);

  if (!client) {
    notFound();
  }

  const projects = await listProjects({ clientId: client.id });
  const canEdit = isOfficeOrAdminRole(roles);

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            לקוח במערכת · נוצר {formatDateTimeByPreference(client.created_at, dateStyle)}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/clients">חזרה לרשימה</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>פרטי קשר</CardTitle>
            <CardDescription>
              {canEdit ? "עריכה זמינה למשרד ואדמין." : "צפייה בלבד לפי תפקיד."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <EditClientForm client={client} />
            ) : (
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">טלפון</dt>
                  <dd className="font-medium">{client.phone?.trim() || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">דוא״ל</dt>
                  <dd className="font-medium">{client.email?.trim() || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">כתובת</dt>
                  <dd className="font-medium">{client.address?.trim() || "—"}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>פרויקטים</CardTitle>
            <CardDescription>
              <Link className="underline" href={`/projects?client=${client.id}`}>
                תצוגת רשימה מלאה עם סינון
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין פרויקטים ללקוח זה.</p>
            ) : (
              <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
                <table className="w-full min-w-[40rem] border-collapse text-start text-sm">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 font-medium">סטטוס</th>
                      <th className="px-3 py-2 font-medium">כתובת אירוע</th>
                      <th className="px-3 py-2 font-medium">תחילת אירוע</th>
                      <th className="px-3 py-2 font-medium">סכום</th>
                      <th className="px-3 py-2 font-medium">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((row) => {
                      const st: ProjectStatus = isProjectStatus(row.status) ? row.status : "quote";
                      return (
                        <tr className="border-b border-border last:border-0" key={row.id}>
                          <td className="px-3 py-2">
                            <ProjectStatusBadge status={st} />
                          </td>
                          <td className="max-w-[12rem] truncate px-3 py-2 text-muted-foreground">
                            {row.location_address ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatDateTimeByPreference(row.event_starts_at, dateStyle)}
                          </td>
                          <td className="px-3 py-2">{formatCurrencyIl(row.total_price)}</td>
                          <td className="px-3 py-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/projects/${row.id}`}>פתיחה</Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
