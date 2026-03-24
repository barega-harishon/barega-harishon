import "server-only";

import { z } from "zod";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import type { ProjectStatus } from "@/types/projects";

const tokenSchema = z.string().uuid();

export interface PublicProjectTrackingPayload {
  status: ProjectStatus;
  location_address: string | null;
  setup_starts_at: string | null;
  event_starts_at: string | null;
  event_ends_at: string | null;
  teardown_at: string | null;
  total_price: number;
  paid_sum: number;
}

function toNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const STATUS_SET = new Set<ProjectStatus>([
  "incoming",
  "quote",
  "approved",
  "prep",
  "setup",
  "teardown",
  "closed",
]);

function parseStatus(raw: unknown): ProjectStatus {
  return typeof raw === "string" && STATUS_SET.has(raw as ProjectStatus)
    ? (raw as ProjectStatus)
    : "quote";
}

/**
 * טעינת פרויקט לפי טוקן מעקב — רק שדות מתאימים ללקוח (ללא שם לקוח מזהה).
 */
export async function getPublicProjectByTrackingToken(
  token: string,
): Promise<PublicProjectTrackingPayload | null> {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) {
    return null;
  }

  const supabase = createServiceRoleSupabaseClient();

  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select(
      "id, status, location_address, setup_starts_at, event_starts_at, event_ends_at, teardown_at, total_price",
    )
    .eq("public_tracking_token", parsed.data)
    .maybeSingle();

  if (projectErr || !project) {
    if (projectErr?.code === "42703" || String(projectErr?.message ?? "").includes("public_tracking_token")) {
      console.error(
        "getPublicProjectByTrackingToken missing migration: public_tracking_token not found",
        projectErr,
      );
    }
    return null;
  }

  const projectId = project.id as string;

  const { data: paymentRows, error: payErr } = await supabase
    .from("payments")
    .select("amount")
    .eq("project_id", projectId);

  if (payErr) {
    console.error("getPublicProjectByTrackingToken payments", payErr);
  }

  const paid_sum = (paymentRows ?? []).reduce(
    (acc, row) => acc + toNumber((row as { amount?: unknown }).amount),
    0,
  );

  return {
    status: parseStatus(project.status),
    location_address:
      typeof project.location_address === "string" ? project.location_address : null,
    setup_starts_at:
      typeof project.setup_starts_at === "string" ? project.setup_starts_at : null,
    event_starts_at:
      typeof project.event_starts_at === "string" ? project.event_starts_at : null,
    event_ends_at:
      typeof project.event_ends_at === "string" ? project.event_ends_at : null,
    teardown_at: typeof project.teardown_at === "string" ? project.teardown_at : null,
    total_price: toNumber(project.total_price),
    paid_sum,
  };
}
