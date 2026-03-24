import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicProjectByTrackingToken } from "@/lib/public-project-tracking";
import { getDateStylePreference } from "@/lib/date-style-server";
import { hasServiceRoleKey } from "@/lib/supabase/service-role";
import { PROJECT_STATUS_LABELS } from "@/types/projects";
import { formatDateTimeByPreference } from "@/utils/date";
import { formatCurrencyIl } from "@/utils/money";

export const dynamic = "force-dynamic";

export default async function PublicProjectTrackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!hasServiceRoleKey()) {
    return (
      <main className="container-page flex min-h-[50vh] flex-col items-center justify-center py-12 text-center">
        <h1 className="text-xl font-semibold">מעקב אירוע</h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          שירות המעקב אינו מוגדר בשרת זה. פנו למשרד לעדכון סטטוס האירוע.
        </p>
      </main>
    );
  }

  const data = await getPublicProjectByTrackingToken(token);
  if (!data) {
    notFound();
  }

  const { status } = data;
  const dateStyle = await getDateStylePreference();
  const balance = Math.max(0, data.total_price - data.paid_sum);

  return (
    <main className="container-page py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">מעקב אירוע</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            עדכון אחרון לפי המערכת — לשאלות נוספות פנו למשרד.
          </p>
        </div>

        <div className="rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
          <dl className="space-y-4 text-sm">
            <div className="flex justify-between gap-4 border-b border-border pb-3">
              <dt className="text-muted-foreground">סטטוס</dt>
              <dd className="font-semibold text-foreground">
                {PROJECT_STATUS_LABELS[status]}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-3">
              <dt className="text-muted-foreground">כתובת אירוע</dt>
              <dd className="max-w-[60%] text-end font-medium">
                {data.location_address ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-3">
              <dt className="text-muted-foreground">הקמה</dt>
              <dd className="text-end">{formatDateTimeByPreference(data.setup_starts_at, dateStyle)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-3">
              <dt className="text-muted-foreground">תחילת אירוע</dt>
              <dd className="text-end">{formatDateTimeByPreference(data.event_starts_at, dateStyle)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-3">
              <dt className="text-muted-foreground">סיום אירוע</dt>
              <dd className="text-end">{formatDateTimeByPreference(data.event_ends_at, dateStyle)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-3">
              <dt className="text-muted-foreground">פירוק</dt>
              <dd className="text-end">{formatDateTimeByPreference(data.teardown_at, dateStyle)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-3">
              <dt className="text-muted-foreground">סכום מוסכם</dt>
              <dd className="font-medium">{formatCurrencyIl(data.total_price)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-3">
              <dt className="text-muted-foreground">שולם</dt>
              <dd className="font-medium">{formatCurrencyIl(data.paid_sum)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">יתרה לתשלום</dt>
              <dd className="font-medium">{formatCurrencyIl(balance)}</dd>
            </div>
          </dl>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <Link className="underline-offset-4 hover:underline" href="/pniha">
            שליחת פנייה חדשה
          </Link>
        </p>
      </div>
    </main>
  );
}
