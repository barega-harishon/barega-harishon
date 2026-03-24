import Link from "next/link";
import { notFound } from "next/navigation";

import { listAssignmentsForProject } from "@/actions/assignments";
import { getProjectById } from "@/actions/projects";
import { listTimeEntriesForProject } from "@/actions/time-entries";
import { FieldProjectStatusForm } from "@/components/field/field-project-status-form";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentAppRole } from "@/lib/auth/current-profile";
import { ASSIGNMENT_ROLE_LABELS } from "@/types/assignments";
import type { AssignmentRole } from "@/types/assignments";
import type { ProjectStatus } from "@/types/projects";

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

export default async function FieldProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  const status: ProjectStatus = isProjectStatus(project.status) ? project.status : "quote";
  const clientName = project.clients?.name ?? "—";
  const role = await getCurrentAppRole();

  const [assignments, timeEntries] = await Promise.all([
    listAssignmentsForProject(project.id),
    listTimeEntriesForProject(project.id),
  ]);

  return (
    <main className="container-page space-y-6 py-6">
      <div className="page-header-row flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold leading-tight">{clientName}</h1>
            <ProjectStatusBadge status={status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {project.location_address ?? "ללא כתובת אירוע"}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/field/projects">לרשימה</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button asChild className="w-full sm:w-auto" size="lg">
          <Link href={`/field/time?project=${encodeURIComponent(project.id)}`}>דיווח שעות לאירוע</Link>
        </Button>
        <Button asChild className="w-full sm:w-auto" variant="outline">
          <Link href={`/projects/${project.id}`}>פרטים מלאים במערכת</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>תאריכים</CardTitle>
          <CardDescription>לפי מה שנרשם בפרויקט.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <Row label="הקמה" value={formatTs(project.setup_starts_at)} />
          <Row label="אירוע" value={formatTs(project.event_starts_at)} />
          <Row label="פירוק" value={formatTs(project.teardown_at)} />
        </CardContent>
      </Card>

      {role === "field" ? (
        <Card>
          <CardHeader>
            <CardTitle>סטטוס בשטח</CardTitle>
            <CardDescription>שינוי לשלבי הכנה, הקמה או פירוק (לפי הרשאות).</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldProjectStatusForm currentStatus={status} projectId={project.id} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>צוות באירוע</CardTitle>
          <CardDescription>שיבוצים לפרויקט זה.</CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין שיבוצים.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {assignments.map((a) => (
                <li className="flex justify-between gap-2 border-b border-border/80 pb-2 last:border-0" key={a.id}>
                  <span className="font-medium">{a.employees?.name ?? "—"}</span>
                  <span className="text-muted-foreground">
                    {ASSIGNMENT_ROLE_LABELS[a.role as AssignmentRole] ?? a.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הדיווחים שלי (שעות)</CardTitle>
          <CardDescription>רשומות שאתם רואים לפי הרשאות.</CardDescription>
        </CardHeader>
        <CardContent>
          {timeEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין דיווחים להצגה.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {timeEntries.map((te) => (
                <li className="flex justify-between gap-2 border-b border-border/80 pb-2 last:border-0" key={te.id}>
                  <span>{te.work_date}</span>
                  <span className="font-mono" dir="ltr">
                    {te.hours} ש׳
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function formatTs(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end font-medium">{value}</span>
    </div>
  );
}
