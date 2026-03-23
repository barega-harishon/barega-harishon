import Link from "next/link";

import { listProjects } from "@/actions/projects";
import { ProjectKanbanBoard } from "@/components/projects/project-kanban-board";
import { Button } from "@/components/ui/button";
import { getCurrentAppRole } from "@/lib/auth/current-profile";

export const dynamic = "force-dynamic";

export default async function ProjectsKanbanPage() {
  const [rows, role] = await Promise.all([listProjects(), getCurrentAppRole()]);
  const canChangeStatus =
    role === "admin" || role === "office" || role === "operations";

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">קנבן פרויקטים</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            פרויקטים לפי שלב במחזור החיים. {canChangeStatus ? "ניתן לעדכן סטטוס ישירות מהכרטיס." : "לצפייה בלבד — עדכון סטטוס מדף הפרויקט."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/projects">תצוגת רשימה</Link>
          </Button>
          <Button asChild>
            <Link href="/projects/new">פרויקט חדש</Link>
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          אין עדיין פרויקטים.{" "}
          <Link className="font-medium text-primary underline" href="/projects/new">
            צרו פרויקט טיוטה ראשון
          </Link>
          .
        </div>
      ) : (
        <ProjectKanbanBoard canChangeStatus={canChangeStatus} projects={rows} />
      )}
    </main>
  );
}
