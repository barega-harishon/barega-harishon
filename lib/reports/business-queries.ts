import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PaymentType } from "@/types/payments";
import { PAYMENT_TYPE_LABELS } from "@/types/payments";
import type { ProjectStatus } from "@/types/projects";
import { PROJECT_STATUS_KANBAN_ORDER } from "@/types/projects";

const ALL_STATUSES = PROJECT_STATUS_KANBAN_ORDER;

function isProjectStatus(value: string): value is ProjectStatus {
  return ALL_STATUSES.includes(value as ProjectStatus);
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export type PipelineStatusRow = {
  status: ProjectStatus;
  count: number;
  totalPrice: number;
};

/** סיכום צינור: מספר פרויקטים וסכום מוסכם לפי סטטוס */
export async function queryPipelineByStatus(): Promise<PipelineStatusRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("projects").select("status, total_price");

  if (error || !data) {
    return ALL_STATUSES.map((status) => ({ status, count: 0, totalPrice: 0 }));
  }

  const acc = new Map<ProjectStatus, { count: number; totalPrice: number }>();
  for (const s of ALL_STATUSES) {
    acc.set(s, { count: 0, totalPrice: 0 });
  }

  for (const row of data) {
    const st = isProjectStatus(String(row.status)) ? row.status : "quote";
    const cur = acc.get(st)!;
    cur.count += 1;
    cur.totalPrice += num(row.total_price);
  }

  return ALL_STATUSES.map((status) => ({
    status,
    count: acc.get(status)!.count,
    totalPrice: acc.get(status)!.totalPrice,
  }));
}

export type ReceivablesKpi = {
  openProjectCount: number;
  totalOpenBalance: number;
};

export async function queryReceivablesKpi(): Promise<ReceivablesKpi> {
  const supabase = await createServerSupabaseClient();
  const [{ data: projects, error: pErr }, { data: payments, error: payErr }] = await Promise.all([
    supabase.from("projects").select("id, total_price"),
    supabase.from("payments").select("project_id, amount"),
  ]);

  if (pErr || !projects || payErr || !payments) {
    return { openProjectCount: 0, totalOpenBalance: 0 };
  }

  const sumByProject = new Map<string, number>();
  for (const row of payments) {
    const pid = row.project_id as string;
    sumByProject.set(pid, (sumByProject.get(pid) ?? 0) + num(row.amount));
  }

  let totalOpenBalance = 0;
  let openProjectCount = 0;
  for (const proj of projects) {
    const id = proj.id as string;
    const totalPrice = num(proj.total_price);
    const paid = sumByProject.get(id) ?? 0;
    const balance = totalPrice - paid;
    if (balance > 0.009) {
      totalOpenBalance += balance;
      openProjectCount += 1;
    }
  }

  return { openProjectCount, totalOpenBalance };
}

export type MonthlyMoneyRow = {
  yearMonth: string;
  label: string;
  total: number;
};

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
  return new Intl.DateTimeFormat("he-IL", { month: "short", year: "numeric" }).format(
    new Date(y, m - 1, 1),
  );
}

/** תשלומים לפי חודש בטווח שנתי (ינואר–דצמבר של `year`) */
export async function queryPaymentsByMonthForYear(year: number): Promise<MonthlyMoneyRow[]> {
  const supabase = await createServerSupabaseClient();
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year + 1, 0, 1, 0, 0, 0, 0);

  const { data, error } = await supabase
    .from("payments")
    .select("amount, paid_at")
    .gte("paid_at", start.toISOString())
    .lt("paid_at", end.toISOString());

  const byMonth = new Map<string, number>();
  if (data && !error) {
    for (const row of data) {
      const paidAt = new Date(row.paid_at as string);
      if (Number.isNaN(paidAt.getTime())) {
        continue;
      }
      const key = formatYearMonth(paidAt);
      byMonth.set(key, (byMonth.get(key) ?? 0) + num(row.amount));
    }
  }

  const rows: MonthlyMoneyRow[] = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(year, m, 1);
    const key = formatYearMonth(d);
    rows.push({
      yearMonth: key,
      label: hebrewMonthLabel(key),
      total: byMonth.get(key) ?? 0,
    });
  }
  return rows;
}

export type PaymentTypeTotalRow = {
  type: PaymentType;
  label: string;
  total: number;
};

const PAYMENT_TYPES: PaymentType[] = ["deposit", "balance", "other"];

/** סיכום תשלומים בשנה לפי סוג */
export async function queryPaymentsByTypeForYear(year: number): Promise<PaymentTypeTotalRow[]> {
  const supabase = await createServerSupabaseClient();
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year + 1, 0, 1, 0, 0, 0, 0);

  const { data, error } = await supabase
    .from("payments")
    .select("amount, type")
    .gte("paid_at", start.toISOString())
    .lt("paid_at", end.toISOString());

  const totals: Record<PaymentType, number> = {
    deposit: 0,
    balance: 0,
    other: 0,
  };

  if (data && !error) {
    for (const row of data) {
      const t = row.type as string;
      if (t === "deposit" || t === "balance" || t === "other") {
        totals[t] += num(row.amount);
      }
    }
  }

  return PAYMENT_TYPES.map((type) => ({
    type,
    label: PAYMENT_TYPE_LABELS[type],
    total: totals[type],
  }));
}

export type NewProjectsMonthRow = {
  yearMonth: string;
  label: string;
  count: number;
  totalPrice: number;
};

/** פרויקטים חדשים לפי חודש יצירה (בשנה) */
export async function queryNewProjectsByMonthForYear(year: number): Promise<NewProjectsMonthRow[]> {
  const supabase = await createServerSupabaseClient();
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year + 1, 0, 1, 0, 0, 0, 0);

  const { data, error } = await supabase
    .from("projects")
    .select("created_at, total_price")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  const byMonth = new Map<string, { count: number; totalPrice: number }>();
  for (let m = 0; m < 12; m++) {
    const key = formatYearMonth(new Date(year, m, 1));
    byMonth.set(key, { count: 0, totalPrice: 0 });
  }

  if (data && !error) {
    for (const row of data) {
      const created = new Date(row.created_at as string);
      if (Number.isNaN(created.getTime())) {
        continue;
      }
      const key = formatYearMonth(created);
      const bucket = byMonth.get(key);
      if (bucket) {
        bucket.count += 1;
        bucket.totalPrice += num(row.total_price);
      }
    }
  }

  const rows: NewProjectsMonthRow[] = [];
  for (let m = 0; m < 12; m++) {
    const key = formatYearMonth(new Date(year, m, 1));
    const b = byMonth.get(key)!;
    rows.push({
      yearMonth: key,
      label: hebrewMonthLabel(key),
      count: b.count,
      totalPrice: b.totalPrice,
    });
  }
  return rows;
}

export type BusinessKpis = {
  /** סכום מוסכם בפרויקטים שאינם סגורים */
  activePipelineValue: number;
  activeProjectCount: number;
  /** סכום מוסכם בפרויקטים סגורים */
  closedBookedValue: number;
  closedProjectCount: number;
  /** סך תשלומים בשנה (לוח שנה) */
  yearPaymentsTotal: number;
};

export async function queryBusinessKpis(year: number): Promise<BusinessKpis> {
  const supabase = await createServerSupabaseClient();

  const [{ data: projects, error: pErr }, { data: payRows, error: payErr }] = await Promise.all([
    supabase.from("projects").select("status, total_price"),
    supabase
      .from("payments")
      .select("amount, paid_at")
      .gte("paid_at", new Date(year, 0, 1).toISOString())
      .lt("paid_at", new Date(year + 1, 0, 1).toISOString()),
  ]);

  let activePipelineValue = 0;
  let activeProjectCount = 0;
  let closedBookedValue = 0;
  let closedProjectCount = 0;

  if (projects && !pErr) {
    for (const row of projects) {
      const st = String(row.status);
      const price = num(row.total_price);
      if (st === "closed") {
        closedBookedValue += price;
        closedProjectCount += 1;
      } else {
        activePipelineValue += price;
        activeProjectCount += 1;
      }
    }
  }

  let yearPaymentsTotal = 0;
  if (payRows && !payErr) {
    for (const row of payRows) {
      yearPaymentsTotal += num(row.amount);
    }
  }

  return {
    activePipelineValue,
    activeProjectCount,
    closedBookedValue,
    closedProjectCount,
    yearPaymentsTotal,
  };
}
