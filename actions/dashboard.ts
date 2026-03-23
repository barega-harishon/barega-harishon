"use server";

import { getEquipmentAvailabilityMap } from "@/actions/project-equipment";
import { getCurrentAppRole } from "@/lib/auth/current-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOfficeOrAdminRole } from "@/types/app-role";
import type { ProjectStatus } from "@/types/projects";
import { PROJECT_STATUS_LABELS } from "@/types/projects";

const UPCOMING_DAYS = 14;
const PAYMENT_HISTORY_MONTHS = 12;

const ALL_STATUSES: ProjectStatus[] = [
  "quote",
  "approved",
  "prep",
  "setup",
  "teardown",
  "closed",
];

export type ProjectStatusCountRow = {
  status: ProjectStatus;
  label: string;
  count: number;
};

export type UpcomingProjectRow = {
  id: string;
  status: ProjectStatus;
  event_starts_at: string;
  client_name: string;
  location_address: string | null;
};

export type LowStockRow = {
  equipment_id: string;
  name: string;
  total_qty: number;
  available: number;
  allocated: number;
};

export type MonthlyPaymentRow = {
  yearMonth: string;
  label: string;
  total: number;
};

function emptyStatusCounts(): Record<ProjectStatus, number> {
  return {
    quote: 0,
    approved: 0,
    prep: 0,
    setup: 0,
    teardown: 0,
    closed: 0,
  };
}

function isProjectStatus(value: string): value is ProjectStatus {
  return ALL_STATUSES.includes(value as ProjectStatus);
}

/** ספירת פרויקטים לפי סטטוס (לפי RLS – שדה רואה רק משובצים). */
export async function getDashboardStatusCounts(): Promise<ProjectStatusCountRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("projects").select("status");

  if (error || !data) {
    return ALL_STATUSES.map((status) => ({
      status,
      label: PROJECT_STATUS_LABELS[status],
      count: 0,
    }));
  }

  const counts = emptyStatusCounts();
  for (const row of data) {
    const s = row.status;
    if (typeof s === "string" && isProjectStatus(s)) {
      counts[s] += 1;
    }
  }

  return ALL_STATUSES.map((status) => ({
    status,
    label: PROJECT_STATUS_LABELS[status],
    count: counts[status],
  }));
}

/** פרויקטים עם אירוע בטווח הימים הקרובים. */
export async function getDashboardUpcomingProjects(): Promise<UpcomingProjectRow[]> {
  const supabase = await createServerSupabaseClient();
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + UPCOMING_DAYS);

  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      id,
      status,
      event_starts_at,
      location_address,
      clients ( name )
    `,
    )
    .not("event_starts_at", "is", null)
    .gte("event_starts_at", now.toISOString())
    .lte("event_starts_at", end.toISOString())
    .order("event_starts_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const clients = row.clients as { name?: string } | null;
    const status = isProjectStatus(String(row.status)) ? row.status : "quote";
    return {
      id: row.id as string,
      status,
      event_starts_at: row.event_starts_at as string,
      client_name: clients?.name ?? "—",
      location_address: (row.location_address as string | null) ?? null,
    };
  });
}

function isLowStock(totalQty: number, available: number): boolean {
  if (totalQty <= 0) {
    return false;
  }
  if (available <= 2) {
    return true;
  }
  const ratio = available / totalQty;
  return ratio <= 0.1;
}

/** פריטי ציוד עם זמינות נמוכה (לפי אותה לוגיקה כמו בפרויקט). */
export async function getDashboardLowStockEquipment(): Promise<LowStockRow[]> {
  const supabase = await createServerSupabaseClient();
  const [{ data: equipment }, availability] = await Promise.all([
    supabase.from("equipment").select("id, name, total_qty").order("name", { ascending: true }),
    getEquipmentAvailabilityMap(),
  ]);

  if (!equipment) {
    return [];
  }

  const rows: LowStockRow[] = [];

  for (const item of equipment) {
    const id = item.id as string;
    const total_qty = Number(item.total_qty);
    const av = availability[id];
    if (!av) {
      continue;
    }
    if (isLowStock(total_qty, av.available)) {
      rows.push({
        equipment_id: id,
        name: String(item.name),
        total_qty,
        available: av.available,
        allocated: av.allocated,
      });
    }
  }

  return rows;
}

function formatYearMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function hebrewMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) {
    return yearMonth;
  }
  const d = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat("he-IL", { month: "short", year: "numeric" }).format(d);
}

/** סכומי תשלומים לפי חודש (רק משרד/אדמין). */
export async function getDashboardMonthlyPayments(): Promise<MonthlyPaymentRow[]> {
  const role = await getCurrentAppRole();
  if (!isOfficeOrAdminRole(role)) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const start = new Date();
  start.setMonth(start.getMonth() - (PAYMENT_HISTORY_MONTHS - 1));
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("payments")
    .select("amount, paid_at")
    .gte("paid_at", start.toISOString());

  if (error || !data) {
    return [];
  }

  const byMonth = new Map<string, number>();
  for (const row of data) {
    const paidAt = new Date(row.paid_at as string);
    if (Number.isNaN(paidAt.getTime())) {
      continue;
    }
    const key = formatYearMonth(paidAt);
    const amt = Number(row.amount);
    byMonth.set(key, (byMonth.get(key) ?? 0) + (Number.isNaN(amt) ? 0 : amt));
  }

  const rows: MonthlyPaymentRow[] = [];
  const cursor = new Date(start);
  const end = new Date();
  while (cursor <= end) {
    const key = formatYearMonth(cursor);
    rows.push({
      yearMonth: key,
      label: hebrewMonthLabel(key),
      total: byMonth.get(key) ?? 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return rows;
}
