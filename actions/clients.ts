"use server";

import { z } from "zod";

import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import type { ClientDetailRow, ClientListRow } from "@/types/clients";
import { sanitizeText } from "@/utils/sanitize";

const createClientSchema = z.object({
  name: z
    .string()
    .min(2, "שם לקוח חייב להכיל לפחות 2 תווים")
    .max(120, "שם לקוח ארוך מדי")
    .transform((v) => sanitizeText(v)),
  phone: z
    .string()
    .max(40, "מספר טלפון ארוך מדי")
    .optional()
    .transform((v) => (v ? sanitizeText(v) : "")),
  email: z
    .string()
    .max(120)
    .optional()
    .transform((v) => (v ? sanitizeText(v.trim().toLowerCase()) : "")),
  address: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v ? sanitizeText(v) : "")),
  nationalId: z
    .string()
    .max(20)
    .optional()
    .transform((v) => (v ? sanitizeText(v) : "")),
});

export interface ClientOption {
  id: string;
  name: string;
}

export interface ClientLookupCandidate {
  id: string;
  name: string;
  national_id: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

function normalizeNationalId(raw: string | undefined): string {
  return (raw ?? "").replace(/\D/g, "").slice(0, 20);
}

function normalizePhone(raw: string | undefined): string {
  return (raw ?? "").replace(/[^\d+]/g, "").slice(0, 20);
}

function embeddedProjectCount(projects: unknown): number {
  if (!Array.isArray(projects) || projects.length === 0) {
    return 0;
  }
  const first = projects[0] as { count?: number };
  return typeof first.count === "number" ? first.count : 0;
}

function normalizeClientListSearch(raw: string | undefined): string {
  if (!raw) {
    return "";
  }
  return raw.trim().replace(/[%_,]/g, "").slice(0, 80);
}

/** רשימת לקוחות עם מספר פרויקטים (למסך CRM בסיסי) */
export async function listClientsWithProjectStats(filter?: {
  search?: string;
}): Promise<ClientListRow[]> {
  const supabase = await createServerSupabaseClient();
  const term = normalizeClientListSearch(filter?.search);

  let query = supabase
    .from("clients")
    .select(
      `
      id,
      name,
      national_id,
      phone,
      email,
      projects ( count )
    `,
    )
    .order("name", { ascending: true });

  if (term.length >= 2) {
    const pattern = `%${term}%`;
    query = query.or(`name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return (data as { id: string; name: string; national_id: string | null; phone: string | null; email: string | null; projects: unknown }[]).map(
    (row) => ({
      id: row.id,
      name: row.name,
      national_id: row.national_id,
      phone: row.phone,
      email: row.email,
      project_count: embeddedProjectCount(row.projects),
    }),
  );
}

export async function getClientById(id: string): Promise<ClientDetailRow | null> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, national_id, phone, email, address, created_at")
    .eq("id", parsed.data)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ClientDetailRow;
}

export async function getClientNameById(id: string): Promise<string | null> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("clients").select("name").eq("id", parsed.data).maybeSingle();

  if (!data || typeof (data as { name?: string }).name !== "string") {
    return null;
  }
  return (data as { name: string }).name;
}

export async function listClientsForSelect(): Promise<ClientOption[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as ClientOption[];
}

export async function createClientFromForm(
  _prev: ActionResult<{ id: string; name: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string; name: string }> | null> {
  return createClient({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    nationalId: formData.get("nationalId"),
  });
}

export async function createClient(
  payload: unknown,
): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = createClientSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: "יש שדות לא תקינים בפרטי הלקוח.",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: parsed.data.name,
        national_id: normalizeNationalId(parsed.data.nationalId),
        phone: normalizePhone(parsed.data.phone) || null,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "הלקוח נשמר בהצלחה.",
      data: { id: data.id as string, name: parsed.data.name },
    };
  } catch (error) {
    console.error("createClient failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

const updateClientSchema = createClientSchema.extend({
  id: z.string().uuid(),
});

export async function updateClient(payload: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = updateClientSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: "יש שדות לא תקינים בפרטי הלקוח.",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("clients")
      .update({
        name: parsed.data.name,
        phone: normalizePhone(parsed.data.phone) || null,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        national_id: normalizeNationalId(parsed.data.nationalId),
      })
      .eq("id", parsed.data.id);

    if (error) {
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "פרטי הלקוח עודכנו.",
      data: { id: parsed.data.id },
    };
  } catch (error) {
    console.error("updateClient failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function updateClientFromForm(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }> | null> {
  return updateClient({
    id: formData.get("id"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    nationalId: formData.get("nationalId"),
  });
}

export async function lookupExistingClient(
  payload: unknown,
): Promise<{ matches: ClientLookupCandidate[] }> {
  const parsed = z
    .object({
      nationalId: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      source: z.enum(["public-inquiry", "new-project"]).optional(),
    })
    .safeParse(payload);
  if (!parsed.success) {
    return { matches: [] };
  }
  const nationalId = normalizeNationalId(parsed.data.nationalId);
  const phone = normalizePhone(parsed.data.phone);
  const email = sanitizeText(parsed.data.email?.trim().toLowerCase() ?? "");
  if (!nationalId && !phone && !email) {
    return { matches: [] };
  }

  const supabase = await createServerSupabaseClient();
  let q = supabase
    .from("clients")
    .select("id, name, national_id, phone, email, address")
    .limit(5);
  if (nationalId) {
    q = q.eq("national_id", nationalId);
  } else if (phone && email) {
    q = q.or(`phone.eq.${phone},email.eq.${email}`);
  } else if (phone) {
    q = q.eq("phone", phone);
  } else if (email) {
    q = q.eq("email", email);
  }

  const { data } = await q;
  const matches = ((data ?? []) as ClientLookupCandidate[]).filter((c) => !!c?.id);
  console.info("lookupExistingClient", {
    source: parsed.data.source ?? "unknown",
    strategy: nationalId ? "national_id" : phone || email ? "phone_email" : "none",
    matches: matches.length,
  });
  return { matches };
}
