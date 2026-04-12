"use server";

import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOfficeOrAdminRole } from "@/types/app-role";
import type { ProjectStatus } from "@/types/projects";

export interface CollectionBalanceRow {
  projectId: string;
  clientName: string;
  status: ProjectStatus;
  totalPrice: number;
  paidSum: number;
  balance: number;
}

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

/** פרויקטים עם יתרה חיובית (משרד/אדמין בלבד). */
export async function listOpenCollectionBalances(): Promise<CollectionBalanceRow[]> {
  const roles = await getCurrentAppRoles();
  if (!isOfficeOrAdminRole(roles)) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const [{ data: projects, error: pErr }, { data: payments, error: payErr }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, status, total_price, clients ( name )")
      .order("created_at", { ascending: false }),
    supabase.from("payments").select("project_id, amount"),
  ]);

  if (pErr || !projects || payErr) {
    return [];
  }

  const sumByProject = new Map<string, number>();
  for (const row of payments ?? []) {
    const pid = row.project_id as string;
    const amt = Number(row.amount);
    sumByProject.set(pid, (sumByProject.get(pid) ?? 0) + (Number.isNaN(amt) ? 0 : amt));
  }

  const rows: CollectionBalanceRow[] = [];

  for (const proj of projects) {
    const id = proj.id as string;
    const totalPrice = Number(proj.total_price);
    const paidSum = sumByProject.get(id) ?? 0;
    const balance = totalPrice - paidSum;
    if (balance <= 0.009) {
      continue;
    }
    const clients = proj.clients as { name?: string } | null;
    const rawStatus = String(proj.status);
    const status = isProjectStatus(rawStatus) ? rawStatus : "quote";
    rows.push({
      projectId: id,
      clientName: clients?.name ?? "—",
      status,
      totalPrice: Number.isNaN(totalPrice) ? 0 : totalPrice,
      paidSum,
      balance,
    });
  }

  rows.sort((a, b) => b.balance - a.balance);
  return rows;
}
