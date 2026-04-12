import Link from "next/link";
import { notFound } from "next/navigation";

import { listEmployeeOptionsForAssignments } from "@/actions/assignments";
import { getTruckActiveProjectAssignment } from "@/actions/project-trucks";
import { getTruckById } from "@/actions/trucks";
import { DeleteTruckButton } from "@/components/trucks/delete-truck-button";
import { EditTruckForm } from "@/components/trucks/edit-truck-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { hasAnyAppRole } from "@/types/app-role";
import { normalizeTruckStatusForForm, TRUCK_STATUS_LABELS, truckDisplayLabel } from "@/types/trucks";

export const dynamic = "force-dynamic";

export default async function EditTruckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [truck, employeeOptions, roles, activeProject] = await Promise.all([
    getTruckById(id),
    listEmployeeOptionsForAssignments(),
    getCurrentAppRoles(),
    getTruckActiveProjectAssignment(id),
  ]);

  if (!truck) {
    notFound();
  }

  const canManage = hasAnyAppRole(roles, ["admin", "operations", "warehouse"]);
  const showDelete = roles.includes("admin");

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">עריכת משאית</h1>
        <Button asChild variant="outline">
          <Link href="/trucks">חזרה לרשימה</Link>
        </Button>
      </div>

      <div className="max-w-2xl space-y-8">
        {canManage ? (
          <Card>
            <CardHeader>
              <CardTitle>{truckDisplayLabel(truck)}</CardTitle>
              <CardDescription>רישוי {truck.license_plate} — שם, הערות, נהג וסטטוס.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {activeProject ? (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">פרויקט פעיל: </span>
                  <Link className="underline" href={`/projects/${activeProject.projectId}`}>
                    {activeProject.label}
                  </Link>
                </p>
              ) : null}
              <EditTruckForm employeeOptions={employeeOptions} truck={truck} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{truckDisplayLabel(truck)}</CardTitle>
              <CardDescription>רישוי {truck.license_plate} — צפייה בלבד (משרד).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {truck.notes ? (
                <p>
                  <span className="font-medium text-foreground">הערות: </span>
                  {truck.notes}
                </p>
              ) : null}
              <p>
                <span className="font-medium text-foreground">נהג: </span>
                {truck.driver?.name ?? "—"}
              </p>
              <p>
                <span className="font-medium text-foreground">סטטוס: </span>
                {TRUCK_STATUS_LABELS[normalizeTruckStatusForForm(truck.status)]}
              </p>
              <p>
                <span className="font-medium text-foreground">פרויקט פעיל: </span>
                {activeProject ? (
                  <Link className="underline" href={`/projects/${activeProject.projectId}`}>
                    {activeProject.label}
                  </Link>
                ) : (
                  "—"
                )}
              </p>
            </CardContent>
          </Card>
        )}
        {showDelete ? (
          <DeleteTruckButton licensePlate={truck.license_plate} truckId={truck.id} />
        ) : null}
      </div>
    </main>
  );
}
