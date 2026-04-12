"use server";

import {
  queryBusinessKpis,
  queryNewProjectsByMonthForYear,
  queryPaymentsByMonthForYear,
  queryPaymentsByTypeForYear,
  queryPipelineByStatus,
  queryReceivablesKpi,
  type BusinessKpis,
  type MonthlyMoneyRow,
  type NewProjectsMonthRow,
  type PaymentTypeTotalRow,
  type PipelineStatusRow,
  type ReceivablesKpi,
} from "@/lib/reports/business-queries";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";
import { isOfficeOrAdminRole } from "@/types/app-role";

export type BusinessReportsBundle = {
  year: number;
  pipeline: PipelineStatusRow[];
  receivables: ReceivablesKpi;
  kpis: BusinessKpis;
  paymentsByMonth: MonthlyMoneyRow[];
  paymentsByType: PaymentTypeTotalRow[];
  newProjectsByMonth: NewProjectsMonthRow[];
};

function clampYear(y: number): number {
  if (!Number.isFinite(y)) {
    return new Date().getFullYear();
  }
  const n = Math.floor(y);
  return Math.min(2100, Math.max(2000, n));
}

/** נתונים למסך דוחות עסקיים — רק משרד/אדמין */
export async function getBusinessReportsBundle(yearInput: number): Promise<BusinessReportsBundle | null> {
  const roles = await getCurrentAppRoles();
  if (!isOfficeOrAdminRole(roles)) {
    return null;
  }

  const year = clampYear(yearInput);

  const [
    pipeline,
    receivables,
    kpis,
    paymentsByMonth,
    paymentsByType,
    newProjectsByMonth,
  ] = await Promise.all([
    queryPipelineByStatus(),
    queryReceivablesKpi(),
    queryBusinessKpis(year),
    queryPaymentsByMonthForYear(year),
    queryPaymentsByTypeForYear(year),
    queryNewProjectsByMonthForYear(year),
  ]);

  return {
    year,
    pipeline,
    receivables,
    kpis,
    paymentsByMonth,
    paymentsByType,
    newProjectsByMonth,
  };
}
