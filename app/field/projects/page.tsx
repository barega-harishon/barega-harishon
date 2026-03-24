import Link from "next/link";

import { listMyAssignedProjectsBrief } from "@/actions/projects";
import { PROJECT_STATUS_LABELS } from "@/types/projects";

export const dynamic = "force-dynamic";

export default async function FieldProjectsPage() {
  const projects = await listMyAssignedProjectsBrief();

  return (
    <main className="container-page py-6">
      <div className="page-intro">
        <h1 className="text-xl font-semibold">הפרויקטים שלי</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          תצוגת שטח מהירה; פרטים מלאים ומדיה — במסך הפרויקט הראשי.
        </p>
      </div>
      <ul className="mt-6 space-y-3">
        {projects.length === 0 ? (
          <li className="text-sm text-muted-foreground">אין פרויקטים משובצים.</li>
        ) : (
          projects.map((p) => (
            <li key={p.id}>
              <Link
                className="block rounded-lg border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-stone-900/10"
                href={`/field/projects/${p.id}`}
              >
                <span className="font-medium">{p.clientName ?? "לקוח"}</span>
                <p className="mt-1 text-sm text-muted-foreground">
                  {PROJECT_STATUS_LABELS[p.status]}
                  {p.location_address ? ` · ${p.location_address}` : ""}
                </p>
              </Link>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
