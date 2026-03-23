import Link from "next/link";

import { listClientsWithProjectStats } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentAppRole } from "@/lib/auth/current-profile";
import { isOfficeOrAdminRole } from "@/types/app-role";

export const dynamic = "force-dynamic";

function parseClientsSearchQuery(value: string | string[] | undefined): string | undefined {
  if (!value || Array.isArray(value)) {
    return undefined;
  }
  const t = value.trim().slice(0, 120);
  return t.length > 0 ? t : undefined;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: qParam } = await searchParams;
  const searchInput = parseClientsSearchQuery(qParam);
  const searchForList =
    searchInput && searchInput.replace(/[%_,]/g, "").trim().length >= 2 ? searchInput : undefined;

  const [rows, role] = await Promise.all([
    listClientsWithProjectStats(searchForList ? { search: searchForList } : undefined),
    getCurrentAppRole(),
  ]);
  const canCreate = isOfficeOrAdminRole(role);

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">לקוחות</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            מאגר לקוחות, חיפוש בשם / טלפון / דוא״ל, ומעבר לפרויקטים לפי לקוח.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate ? (
            <Button asChild>
              <Link href="/clients/new">לקוח חדש</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/projects">כל הפרויקטים</Link>
          </Button>
        </div>
      </div>

      <form
        className="mb-4 flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end"
        method="get"
        role="search"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <label className="text-sm font-medium" htmlFor="clients-search-q">
            חיפוש לקוח
          </label>
          <Input
            defaultValue={searchInput ?? ""}
            id="clients-search-q"
            name="q"
            placeholder="שם, טלפון או דוא״ל…"
            type="search"
          />
        </div>
        <Button type="submit">חיפוש</Button>
        {searchInput ? (
          <Button asChild variant="outline">
            <Link href="/clients">נקה</Link>
          </Button>
        ) : null}
      </form>
      {searchInput && !searchForList ? (
        <p className="mb-4 text-sm text-amber-800 dark:text-amber-200">
          נא להקליד לפחות 2 תווים לחיפוש (לאחר סינון תווים מיוחדים).
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            {searchForList
              ? `לא נמצאו לקוחות עבור "${searchInput}".`
              : "אין לקוחות רשומים."}
          </p>
          {searchForList ? (
            <Button asChild variant="outline">
              <Link href="/clients">נקה חיפוש</Link>
            </Button>
          ) : null}
          {!searchForList && canCreate ? (
            <Button asChild>
              <Link href="/clients/new">הוספת לקוח ראשון</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
          <table className="w-full min-w-[40rem] border-collapse text-start text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-medium">שם</th>
                <th className="px-4 py-3 font-medium">טלפון</th>
                <th className="px-4 py-3 font-medium">דוא״ל</th>
                <th className="px-4 py-3 font-medium">פרויקטים</th>
                <th className="px-4 py-3 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b border-border last:border-0" key={row.id}>
                  <td className="px-4 py-3 font-medium">
                    <Link className="hover:underline" href={`/clients/${row.id}`}>
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.phone?.trim() || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.email?.trim() || "—"}</td>
                  <td className="px-4 py-3">{row.project_count}</td>
                  <td className="px-4 py-3">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/projects?client=${row.id}`}>פרויקטים</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
