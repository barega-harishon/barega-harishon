import Link from "next/link";
import { notFound } from "next/navigation";

import {
  listAssignmentsForProject,
  listEmployeeOptionsForAssignments,
} from "@/actions/assignments";
import {
  getEquipmentAvailabilityMap,
  listEquipmentOptions,
  listProjectEquipmentLines,
} from "@/actions/project-equipment";
import { listEquipmentBatchAvailabilityForEquipmentIds } from "@/actions/equipment-batches";
import { listProjectTruckLines, listTruckOptionsForProject } from "@/actions/project-trucks";
import { listPaymentsForProject } from "@/actions/payments";
import { getProjectById } from "@/actions/projects";
import { listTimeEntriesForProject } from "@/actions/time-entries";
import { ProjectTrackingLinkPanel } from "@/components/projects/project-tracking-link-panel";
import { ProjectAssignmentsSection } from "@/components/projects/project-assignments-section";
import { ProjectEquipmentSection } from "@/components/projects/project-equipment-section";
import { ProjectTrucksSection } from "@/components/projects/project-trucks-section";
import { ProjectMediaSection } from "@/components/projects/project-media-section";
import { ProjectPaymentsSection } from "@/components/projects/project-payments-section";
import { ProjectQuoteActions } from "@/components/projects/project-quote-actions";
import { ProjectCoreDetailsForm } from "@/components/projects/project-core-details-form";
import { ProjectSiteDetailsForm } from "@/components/projects/project-site-details-form";
import { FieldProjectStatusForm } from "@/components/field/field-project-status-form";
import { ProjectStatusForm } from "@/components/projects/project-status-form";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { ProjectTimeEntryStaffForm } from "@/components/projects/project-time-entry-staff-form";
import { ProjectTotalPriceForm } from "@/components/projects/project-total-price-form";
import { Button } from "@/components/ui/button";
import { getCurrentUserEmployeeId } from "@/lib/auth/current-employee";
import { getCurrentAppRole } from "@/lib/auth/current-profile";
import { getDateStylePreference } from "@/lib/date-style-server";
import { getPreferredSiteOrigin } from "@/lib/site-origin";
import { isFieldRole, isOfficeOrAdminRole } from "@/types/app-role";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProjectStatus } from "@/types/projects";
import { SITE_PHOTOS_BUCKET, SKETCHES_BUCKET } from "@/lib/storage/buckets";
import { createSignedUrls } from "@/lib/storage/signed-urls";
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

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  const status: ProjectStatus = isProjectStatus(project.status)
    ? project.status
    : "quote";
  const clientName = project.clients?.name ?? "—";
  const siteDetails = project.project_site_details;
  const photoPaths = siteDetails?.site_photo_paths ?? [];
  const photoRefs = await createSignedUrls(SITE_PHOTOS_BUCKET, photoPaths);
  const sketchPath =
    typeof siteDetails?.sketch_path === "string" ? siteDetails.sketch_path : null;
  const sketchRefs = sketchPath
    ? await createSignedUrls(SKETCHES_BUCKET, [sketchPath])
    : [];
  const sketchSignedUrl = sketchRefs[0]?.url ?? null;

  const trackingToken =
    typeof project.public_tracking_token === "string"
      ? project.public_tracking_token
      : null;
  const siteOrigin = trackingToken ? await getPreferredSiteOrigin() : null;
  const trackingUrl =
    trackingToken && siteOrigin ? `${siteOrigin}/track/${trackingToken}` : null;

  const [role, dateStyle] = await Promise.all([getCurrentAppRole(), getDateStylePreference()]);
  const showPayments = isOfficeOrAdminRole(role);
  const canApproveIncoming = isOfficeOrAdminRole(role);
  const canEditPricing =
    role === "admin" || role === "office" || role === "operations";
  const canAddAssignments = canEditPricing;
  const canRemoveAssignments = role === "admin";

  const [
    equipmentLines,
    equipmentOptions,
    equipmentAvailability,
    payments,
    assignments,
    employeeOptions,
    projectTruckLines,
    truckOptionsForProject,
    timeEntries,
    myEmployeeId,
  ] = await Promise.all([
    listProjectEquipmentLines(project.id),
    listEquipmentOptions(),
    getEquipmentAvailabilityMap(),
    showPayments ? listPaymentsForProject(project.id) : Promise.resolve([]),
    listAssignmentsForProject(project.id),
    listEmployeeOptionsForAssignments(),
    listProjectTruckLines(project.id),
    listTruckOptionsForProject(project.id),
    listTimeEntriesForProject(project.id),
    getCurrentUserEmployeeId(),
  ]);
  const batchAvailabilityByEquipment = await listEquipmentBatchAvailabilityForEquipmentIds(
    equipmentLines.map((line) => line.equipment_id),
  );

  const imAssignedToProject = myEmployeeId
    ? assignments.some((a) => a.employee_id === myEmployeeId)
    : false;
  const showTimeEntriesBlock =
    timeEntries.length > 0 ||
    canEditPricing ||
    (role === "field" && imAssignedToProject);

  const equipmentLinesView = equipmentLines.map((line) => ({
    ...line,
    headroom:
      (equipmentAvailability[line.equipment_id]?.available ?? 0) + line.quantity,
  }));

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">פרויקט</h1>
            <ProjectStatusBadge status={status} />
          </div>
          <p className="text-sm text-muted-foreground">
            לקוח: <span className="font-medium text-foreground">{clientName}</span>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/projects">חזרה לרשימה</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {trackingUrl ? (
          <div className="lg:col-span-2">
            <ProjectTrackingLinkPanel trackingUrl={trackingUrl} />
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>פרטים</CardTitle>
            <CardDescription>כתובת, סכום ותאריכים.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <span className="text-muted-foreground">כתובת אירוע</span>
              <span className="max-w-[60%] text-end font-medium">
                {project.location_address ?? "—"}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <span className="text-muted-foreground">סכום כולל</span>
              <span className="font-medium">{formatCurrencyIl(project.total_price)}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <span className="text-muted-foreground">הקמה</span>
              <span className="text-end">{formatDateTimeByPreference(project.setup_starts_at, dateStyle)}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <span className="text-muted-foreground">תחילת אירוע</span>
              <span className="text-end">{formatDateTimeByPreference(project.event_starts_at, dateStyle)}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <span className="text-muted-foreground">סיום אירוע</span>
              <span className="text-end">{formatDateTimeByPreference(project.event_ends_at, dateStyle)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">פירוק</span>
              <span className="text-end">{formatDateTimeByPreference(project.teardown_at, dateStyle)}</span>
            </div>
            {canEditPricing ? <ProjectCoreDetailsForm project={project} /> : null}
            <ProjectQuoteActions
              projectId={project.id}
              showEmail={showPayments && Boolean(process.env.RESEND_API_KEY?.trim())}
            />
            {canEditPricing ? (
              <ProjectTotalPriceForm initialTotalPrice={project.total_price} projectId={project.id} />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ניהול סטטוס</CardTitle>
            <CardDescription>
              {isFieldRole(role)
                ? "שטח: ניתן לעדכן לשלבי הכנה, הקמה ופירוק בלבד (לפי שיבוץ והרשאות)."
                : "עדכון שלב הפרויקט במחזור החיים."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isFieldRole(role) ? (
              <FieldProjectStatusForm currentStatus={status} projectId={project.id} />
            ) : (
              <ProjectStatusForm
                canApproveIncoming={canApproveIncoming}
                currentStatus={status}
                projectId={project.id}
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>פרטי אתר (טופס לקוח / שטח)</CardTitle>
            <CardDescription>
              דרכי גישה, צבעי חיפוי (שטיח ובד) והערות. תמונות וסקיצה — בסעיף המדיה למטה.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <ProjectSiteDetailsForm initial={siteDetails} projectId={project.id} />
            <ProjectMediaSection
              manualPhotoPathsText={photoPaths.join("\n")}
              photos={photoRefs}
              projectId={project.id}
              sketchPath={sketchPath}
              sketchSignedUrl={sketchSignedUrl}
            />
          </CardContent>
        </Card>

        {showPayments ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>גבייה ותשלומים</CardTitle>
              <CardDescription>מעקב מקדמות ויתרות לפרויקט זה.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectPaymentsSection
                payments={payments}
                projectId={project.id}
                totalPrice={project.total_price}
              />
            </CardContent>
          </Card>
        ) : null}

        {showTimeEntriesBlock ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>דיווח שעות</CardTitle>
              <CardDescription>
                מעקב שעות לפי עובד ותאריך. דיווח עצמי לשטח — ב־
                <Link className="underline-offset-2 hover:underline" href="/field/time">
                  אזור שטח
                </Link>
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {timeEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">אין דיווחים לפרויקט זה.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[280px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-start text-muted-foreground">
                        <th className="py-2 font-medium">תאריך</th>
                        <th className="py-2 font-medium">עובד</th>
                        <th className="py-2 font-medium">שעות</th>
                        <th className="py-2 font-medium">הערה</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeEntries.map((te) => (
                        <tr className="border-b border-border/80" key={te.id}>
                          <td className="py-2">{te.work_date}</td>
                          <td className="py-2">{te.employees?.name ?? "—"}</td>
                          <td className="py-2 font-mono" dir="ltr">
                            {te.hours}
                          </td>
                          <td className="max-w-[200px] py-2 text-muted-foreground">
                            {te.note ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {canEditPricing ? (
                <ProjectTimeEntryStaffForm
                  employeeOptions={employeeOptions}
                  projectId={project.id}
                />
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>שיבוץ עובדים</CardTitle>
            <CardDescription>
              ראש צוות, נהג ופועלים לפרויקט זה. צוות שטח רואה שיבוצים רק לפרויקטים שלו.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectAssignmentsSection
              assignments={assignments}
              canAdd={canAddAssignments}
              canRemove={canRemoveAssignments}
              employeeOptions={employeeOptions}
              projectId={project.id}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ציוד בפרויקט</CardTitle>
            <CardDescription>
              שיבוץ פריטים מהמלאי. הכמויות נבדקות מול פרויקטים שאינם במצב &quot;סגור&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectEquipmentSection
              availability={equipmentAvailability}
              batchAvailabilityByEquipment={batchAvailabilityByEquipment}
              lines={equipmentLinesView}
              options={equipmentOptions}
              projectId={project.id}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>משאיות לפרויקט</CardTitle>
            <CardDescription>
              שיבוץ משאיות מהצי. משאית אחת לא יכולה להיות על שני פרויקטים פעילים במקביל.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectTrucksSection
              canManage={canAddAssignments}
              lines={projectTruckLines}
              options={truckOptionsForProject}
              projectId={project.id}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
