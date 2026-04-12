import Link from "next/link";
import { notFound } from "next/navigation";

import { getEmployeeById, listEmployeeFileEvents } from "@/actions/employees";
import { EmployeeAuthAccountSection } from "@/components/employees/employee-auth-account-section";
import { EmployeeFileEventsList } from "@/components/employees/employee-file-events-list";
import { EmployeeFilesCell, type EmployeeFileLink } from "@/components/employees/employee-files-cell";
import { EmployeeFilesUploadForm } from "@/components/employees/employee-files-upload-form";
import { Button } from "@/components/ui/button";
import { getCurrentAppRole } from "@/lib/auth/current-profile";
import { getDateStylePreference } from "@/lib/date-style-server";
import { EMPLOYEE_FILES_BUCKET } from "@/lib/storage/buckets";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EMPLOYEE_TYPE_LABELS } from "@/types/employees";
import { formatCurrencyIl } from "@/utils/money";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ setup?: string | string[] }>;
};

function displayFileNameFromPath(path: string): string {
  const fileWithStamp = path.split("/").pop() ?? path;
  const firstUnderscore = fileWithStamp.indexOf("_");
  if (firstUnderscore <= 0) {
    return fileWithStamp;
  }
  return fileWithStamp.slice(firstUnderscore + 1);
}

async function toSignedLinks(paths: string[] | null | undefined): Promise<EmployeeFileLink[]> {
  if (!Array.isArray(paths) || paths.length === 0) {
    return [];
  }
  const supabase = await createServerSupabaseClient();
  const links = await Promise.all(
    paths.slice(0, 30).map(async (path) => {
      const { data } = await supabase.storage.from(EMPLOYEE_FILES_BUCKET).createSignedUrl(path, 60 * 60);
      if (!data?.signedUrl) {
        return null;
      }
      return {
        path,
        name: displayFileNameFromPath(path),
        url: data.signedUrl,
      } satisfies EmployeeFileLink;
    }),
  );
  return links.filter((v): v is EmployeeFileLink => v !== null);
}

export default async function EmployeeDetailsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const setupRaw = sp.setup;
  const setup = Array.isArray(setupRaw) ? setupRaw[0] : setupRaw;
  const highlightAuthSetup = setup === "auth";

  const [row, role, dateStyle] = await Promise.all([
    getEmployeeById(id),
    getCurrentAppRole(),
    getDateStylePreference(),
  ]);
  if (!row) {
    notFound();
  }

  const canManage = role === "admin" || role === "office" || role === "operations";
  const canLinkAuthAccount = role === "admin" || role === "office";
  const isAdmin = role === "admin";
  const showAdminInviteLink = isAdmin && Boolean(row.email?.trim()) && !row.auth_user_id;
  const [documents, licenses, events] = await Promise.all([
    toSignedLinks(row.documents_paths),
    toSignedLinks(row.licenses_paths),
    listEmployeeFileEvents(row.id),
  ]);

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{row.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            כרטיס עובד: פרטים אישיים, בנק, מסמכים ורשיונות.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/employees">חזרה לצוות</Link>
        </Button>
      </div>

      {highlightAuthSetup && !canLinkAuthAccount ? (
        <div
          className="mb-6 rounded-[var(--radius)] border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground"
          role="status"
        >
          <p className="font-medium">המשך להגדרת חשבון התחברות (שטח)</p>
          <p className="mt-1 text-muted-foreground">
            קישור חשבון Auth לעובד זה מבוצע על ידי משתמש עם תפקיד משרד או אדמין. פנו למשרד או היכנסו כאדמין
            להזמנת משתמש חדש, ואז חזרו לכאן לקישור.
          </p>
          <Button asChild className="mt-3" size="sm" variant="outline">
            <Link href="/employees">חזרה לרשימת הצוות</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[var(--radius)] border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium">
              {EMPLOYEE_TYPE_LABELS[row.type]}
            </span>
            <span className="text-sm text-muted-foreground">
              תעריף: {row.type === "hourly" ? formatCurrencyIl(row.hourly_rate) : "—"}
            </span>
          </div>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">טלפון</dt><dd>{row.phone ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">דוא״ל</dt><dd>{row.email ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">ת.ז / מזהה</dt><dd>{row.national_id ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">זמינות</dt><dd>{row.availability_note ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">בנק</dt><dd>{row.bank_name ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">סניף</dt><dd>{row.bank_branch ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">חשבון</dt><dd>{row.bank_account_number ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">בעל החשבון</dt><dd>{row.bank_account_holder ?? "—"}</dd></div>
          </dl>
          <div className="mt-4 grid gap-3">
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">הערות מסמכים</p>
              <p className="text-sm">{row.documents_notes ?? "—"}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">הערות רשיונות</p>
              <p className="text-sm">{row.licenses_notes ?? "—"}</p>
            </div>
          </div>
        </section>

        {canLinkAuthAccount ? (
          <EmployeeAuthAccountSection
            defaultEmail={row.email}
            employeeId={row.id}
            highlightAuthSetup={highlightAuthSetup}
            linkedAuthUserId={row.auth_user_id}
            showAdminInviteLink={showAdminInviteLink}
          />
        ) : null}

        <section className="space-y-4 rounded-[var(--radius)] border border-border bg-card p-4">
          <h2 className="text-base font-semibold">קבצים</h2>
          <EmployeeFilesCell employeeId={row.id} documents={documents} licenses={licenses} />
          {canManage ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <EmployeeFilesUploadForm employeeId={row.id} category="documents" title="הוספת מסמכים" />
              <EmployeeFilesUploadForm employeeId={row.id} category="licenses" title="הוספת רשיונות" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">אין לך הרשאה להעלאת/מחיקת קבצים.</p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-[var(--radius)] border border-border bg-card p-4">
        <h2 className="mb-3 text-base font-semibold">יומן פעולות קבצים</h2>
        <EmployeeFileEventsList events={events} dateStyle={dateStyle} />
      </section>
    </main>
  );
}
