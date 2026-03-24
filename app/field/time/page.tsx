import Link from "next/link";
import { z } from "zod";

import {
  listMyRecentTimeEntries,
  listTimeEntryProjectOptionsForMe,
} from "@/actions/time-entries";
import { FieldTimeForm } from "@/components/field/field-time-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

function formatWorkDateHe(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) {
    return isoDate;
  }
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

export default async function FieldTimePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const sp = await searchParams;
  const projectParam = typeof sp.project === "string" ? sp.project : undefined;
  const parsedProject = z.string().uuid().safeParse(projectParam);
  const defaultProjectId = parsedProject.success ? parsedProject.data : null;

  const [projectOptions, recent] = await Promise.all([
    listTimeEntryProjectOptionsForMe(),
    listMyRecentTimeEntries(25),
  ]);

  type Row = (typeof recent)[number] & {
    projects?: {
      location_address?: string | null;
      clients?: { name?: string } | null;
    } | null;
  };

  return (
    <main className="container-page space-y-8 py-6">
      <div className="page-intro">
        <h1 className="text-xl font-semibold">דיווח שעות</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          רק לפרויקטים שאתם משובצים אליהם.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>דיווח חדש</CardTitle>
          <CardDescription>תאריך ביצוע, משך בשעות והערה אופציונלית.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldTimeForm defaultProjectId={defaultProjectId} projectOptions={projectOptions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>דיווחים אחרונים</CardTitle>
          <CardDescription>ההזנות האחרונות שלכם במערכת.</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">עדיין אין דיווחים.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {recent.map((entry) => {
                const r = entry as Row;
                const proj = r.projects;
                const label =
                  proj?.clients?.name && proj?.location_address
                    ? `${proj.clients.name} · ${proj.location_address}`
                    : proj?.clients?.name ?? proj?.location_address ?? r.project_id.slice(0, 8);
                return (
                  <li
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-muted/20"
                    key={r.id}
                  >
                    <div>
                      <p className="font-medium">{formatWorkDateHe(r.work_date)}</p>
                      <p className="text-xs text-muted-foreground">
                        <Link className="hover:underline" href={`/field/projects/${r.project_id}`}>
                          {label}
                        </Link>
                      </p>
                      {r.note ? <p className="mt-1 text-xs text-muted-foreground">{r.note}</p> : null}
                    </div>
                    <span className="font-mono text-sm" dir="ltr">
                      {r.hours} ש׳
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
