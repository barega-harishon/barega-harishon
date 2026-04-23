import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightCircle } from "lucide-react";

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
import { HeaderInfoModal } from "@/components/common/header-info-modal";
import { ProjectAssignmentsSection } from "@/components/projects/project-assignments-section";
import { ProjectEquipmentSection } from "@/components/projects/project-equipment-section";
import { ProjectTrucksSection } from "@/components/projects/project-trucks-section";
import { ProjectMediaSection } from "@/components/projects/project-media-section";
import { ProjectPaymentsSection } from "@/components/projects/project-payments-section";
import { ProjectQuoteActions } from "@/components/projects/project-quote-actions";
import { ProjectCoreDetailsForm } from "@/components/projects/project-core-details-form";
import { ProjectSiteDetailsForm } from "@/components/projects/project-site-details-form";
import { ProjectStatusInlineControl } from "@/components/projects/project-status-inline-control";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { ProjectTimeEntryStaffForm } from "@/components/projects/project-time-entry-staff-form";
import { ProjectTotalPriceForm } from "@/components/projects/project-total-price-form";
import { Button } from "@/components/ui/button";
import { getCurrentUserEmployeeId } from "@/lib/auth/current-employee";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { getDateStylePreference } from "@/lib/date-style-server";
import { getPreferredSiteOrigin } from "@/lib/site-origin";
import { hasAnyAppRole, isFieldRole, isOfficeOrAdminRole } from "@/types/app-role";
import {
  Card,
  CardContent,
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

  const [roles, dateStyle] = await Promise.all([getCurrentAppRoles(), getDateStylePreference()]);
  const showPayments = isOfficeOrAdminRole(roles);
  const canApproveIncoming = isOfficeOrAdminRole(roles);
  const isFieldUser = isFieldRole(roles);
  const canEditPricing = hasAnyAppRole(roles, ["admin", "office", "operations"]);
  const canAddAssignments = canEditPricing;
  const canRemoveAssignments = roles.includes("admin");

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
    (isFieldRole(roles) && imAssignedToProject);

  const equipmentLinesView = equipmentLines.map((line) => ({
    ...line,
    headroom:
      (equipmentAvailability[line.equipment_id]?.available ?? 0) + line.quantity,
  }));

  return (
    <main className="container-page overflow-x-clip py-4 sm:py-8">
      <div className="page-header-row mb-6 space-y-2">
        <div className="flex items-center justify-start">
          <Button asChild size="icon" variant="outline">
            <Link aria-label="חזרה לרשימת פרויקטים" href="/projects">
              <ArrowRightCircle className="h-5 w-5" />
            </Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">פרויקט</h1>
          <ProjectStatusBadge status={status} />
          {(canEditPricing || isFieldUser) ? (
            <ProjectStatusInlineControl
              canApproveIncoming={canApproveIncoming}
              currentStatus={status}
              isFieldUser={isFieldUser}
              projectId={project.id}
            />
          ) : null}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>
            <strong className="font-semibold text-foreground">מס&apos; פרויקט:</strong>{" "}
            {project.id.slice(0, 8).toUpperCase()}
          </span>
          <span className="hidden sm:inline" aria-hidden>
            |
          </span>
          <span>
            <strong className="font-semibold text-foreground">לקוח:</strong> {clientName}
          </span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        {trackingUrl ? (
          <div className="lg:col-span-2">
            <ProjectTrackingLinkPanel trackingUrl={trackingUrl} />
          </div>
        ) : null}

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>זמני פרויקט + פרטי אתר וגישה</CardTitle>
              <HeaderInfoModal label="הנחיות זמנים ופרטי אתר">
                <p>עריכת זמני הפרויקט, גישה והערות אתר. שמירה מתבצעת בכל טופס בתחתית.</p>
              </HeaderInfoModal>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {canEditPricing ? (
              <ProjectCoreDetailsForm project={project} />
            ) : (
              <div className="space-y-2 rounded-[var(--radius)] border border-border bg-muted/20 p-3 text-sm">
                <div className="flex items-start justify-between gap-3 border-b border-border pb-2">
                  <span className="text-muted-foreground">כתובת אירוע</span>
                  <span className="max-w-[70%] text-end font-medium break-words">{project.location_address ?? "—"}</span>
                </div>
                <div className="grid gap-2 pt-1 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-card p-2">
                    <p className="text-xs text-muted-foreground">הקמה</p>
                    <p>{formatDateTimeByPreference(project.setup_starts_at, dateStyle)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card p-2">
                    <p className="text-xs text-muted-foreground">תחילת אירוע</p>
                    <p>{formatDateTimeByPreference(project.event_starts_at, dateStyle)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card p-2">
                    <p className="text-xs text-muted-foreground">סיום אירוע</p>
                    <p>{formatDateTimeByPreference(project.event_ends_at, dateStyle)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card p-2">
                    <p className="text-xs text-muted-foreground">פירוק</p>
                    <p>{formatDateTimeByPreference(project.teardown_at, dateStyle)}</p>
                  </div>
                </div>
              </div>
            )}
            <ProjectSiteDetailsForm initial={siteDetails} projectId={project.id} />
            <ProjectMediaSection
              photos={photoRefs}
              projectId={project.id}
              sketchPath={sketchPath}
              sketchSignedUrl={sketchSignedUrl}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>ציוד + צבעי חיפויים</CardTitle>
              <HeaderInfoModal label="הנחיות ציוד וחיפויים">
                <p>שיבוץ ציוד לפרויקט ועדכון צבעי חיפוי. כל טופס במקטע נשמר בנפרד.</p>
              </HeaderInfoModal>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProjectEquipmentSection
              availability={equipmentAvailability}
              batchAvailabilityByEquipment={batchAvailabilityByEquipment}
              lines={equipmentLinesView}
              options={equipmentOptions}
              projectId={project.id}
              siteDetails={siteDetails}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>כספים: הצעת מחיר, גבייה ותשלומים</CardTitle>
              <HeaderInfoModal label="הנחיות מקטע כספים">
                <p>ניהול הצעת מחיר, סכום כולל ותשלומים בפועל.</p>
              </HeaderInfoModal>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProjectQuoteActions
              projectId={project.id}
              showEmail={showPayments && Boolean(process.env.RESEND_API_KEY?.trim())}
            />
            {canEditPricing ? (
              <ProjectTotalPriceForm initialTotalPrice={project.total_price} projectId={project.id} />
            ) : (
              <div className="rounded-[var(--radius)] border border-border bg-muted/20 p-3 text-sm">
                <span className="text-muted-foreground">סכום כולל: </span>
                <span className="font-semibold">{formatCurrencyIl(project.total_price)}</span>
              </div>
            )}
            {showPayments ? (
              <ProjectPaymentsSection
                payments={payments}
                projectId={project.id}
                totalPrice={project.total_price}
              />
            ) : (
              <p className="text-sm text-muted-foreground">ניהול תשלומים זמין לתפקידי משרד ואדמין בלבד.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>צוות + שעות עבודה</CardTitle>
              <HeaderInfoModal label="הנחיות צוות ושעות עבודה">
                <p>שיבוץ עובדים לפרויקט ומעקב/הוספת דיווחי שעות.</p>
              </HeaderInfoModal>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProjectAssignmentsSection
              assignments={assignments}
              canAdd={canAddAssignments}
              canRemove={canRemoveAssignments}
              employeeOptions={employeeOptions}
              projectId={project.id}
            />
            {showTimeEntriesBlock ? (
              <div className="space-y-4 rounded-[var(--radius)] border border-border bg-muted/10 p-4">
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
                            <td className="max-w-[200px] py-2 text-muted-foreground">{te.note ?? "—"}</td>
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
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">דיווח שעות יוצג כאן כאשר יש דיווחים או הרשאת ניהול.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>משאיות לפרויקט</CardTitle>
              <HeaderInfoModal label="הנחיות משאיות לפרויקט">
                <p>שיבוץ משאיות מהצי. משאית אחת לא יכולה להיות על שני פרויקטים פעילים במקביל.</p>
              </HeaderInfoModal>
            </div>
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
