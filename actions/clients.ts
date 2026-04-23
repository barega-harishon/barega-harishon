"use server";

import * as XLSX from "xlsx";
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

type CsvRow = Record<string, string>;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    return [];
  }
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row: CsvRow = {};
    header.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    return row;
  });
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

const CLIENT_IMPORT_KEY_ALIASES: Record<string, string> = (() => {
  const raw: Record<string, string> = {
    name: "name",
    שם: "name",
    "שם לקוח": "name",
    phone: "phone",
    טלפון: "phone",
    email: "email",
    "דוא\"ל": "email",
    "דואל": "email",
    address: "address",
    כתובת: "address",
    national_id: "nationalId",
    nationalid: "nationalId",
    nationalidpassport: "nationalId",
    "חפ/תז": "nationalId",
    "ח.פ/ת.ז": "nationalId",
    "ח\"פ/ת\"ז": "nationalId",
    "ח\"פ": "nationalId",
    תז: "nationalId",
    "ת\"ז": "nationalId",
    "ת.ז": "nationalId",
  };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[normalizeHeader(k.replace(/[\u200e\u200f]/g, ""))] = v;
  }
  return out;
})();

function canonicalClientImportRow(raw: CsvRow): CsvRow {
  const out: CsvRow = {};
  for (const [k, v] of Object.entries(raw)) {
    const nk = normalizeHeader(String(k).replace(/[\u200e\u200f]/g, ""));
    const canon = CLIENT_IMPORT_KEY_ALIASES[nk] ?? nk;
    const val = String(v ?? "").trim();
    if (!val) {
      continue;
    }
    if (!out[canon]) {
      out[canon] = val;
    }
  }
  return out;
}

function parseXlsx(buffer: ArrayBuffer): CsvRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  return rows.map((raw) => {
    const out: CsvRow = {};
    for (const [k, v] of Object.entries(raw)) {
      out[normalizeHeader(k)] = String(v ?? "").trim();
    }
    return out;
  });
}

function isCsvRowAllEmpty(raw: CsvRow): boolean {
  return Object.values(raw).every((v) => !String(v ?? "").trim());
}

const clientImportRowSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(40).optional(),
  email: z.string().email("דוא\"ל לא תקין").max(120).optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  nationalId: z.string().max(20).optional(),
});

export interface ClientImportIssue {
  row: number;
  column: string;
  value: string;
  message: string;
}

export async function importClientsFromCsvForm(
  _prev: ActionResult<{ imported: number; failed: number; issues: ClientImportIssue[] }> | null,
  formData: FormData,
): Promise<ActionResult<{ imported: number; failed: number; issues: ClientImportIssue[] }> | null> {
  try {
    const roles = await getCurrentAppRoles();
    if (!isOfficeOrAdminRole(roles)) {
      return { success: false, message: "אין הרשאה לייבוא לקוחות." };
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, message: "נא לבחור קובץ לייבוא." };
    }
    const lowerName = file.name.toLowerCase();
    const isXlsx = lowerName.endsWith(".xlsx");
    const isCsv = lowerName.endsWith(".csv");
    if (!isXlsx && !isCsv) {
      return { success: false, message: "פורמט לא נתמך. נא להעלות CSV או XLSX." };
    }

    const rows = isXlsx ? parseXlsx(await file.arrayBuffer()) : parseCsv(await file.text());
    if (rows.length === 0) {
      return { success: false, message: "הקובץ ריק או לא בפורמט תבנית תקין." };
    }

    const supabase = await createServerSupabaseClient();
    let imported = 0;
    const issues: ClientImportIssue[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const raw = rows[i];
      if (isCsvRowAllEmpty(raw)) {
        continue;
      }
      const mapped = canonicalClientImportRow(raw);
      const parsed = clientImportRowSchema.safeParse(mapped);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        issues.push({
          row: i + 2,
          column: first?.path?.length ? String(first.path[0]) : "unknown",
          value: first?.path?.length ? String(mapped[String(first.path[0])] ?? "") : "",
          message: first?.message ?? "נתונים חסרים או שגויים.",
        });
        continue;
      }

      const data = parsed.data;
      const payload = {
        name: sanitizeText(data.name),
        phone: normalizePhone(data.phone) || null,
        email: data.email ? sanitizeText(data.email.trim().toLowerCase()) : null,
        address: data.address ? sanitizeText(data.address) : null,
        national_id: normalizeNationalId(data.nationalId) || null,
      };

      const { error } = await supabase.from("clients").insert(payload);
      if (error) {
        issues.push({
          row: i + 2,
          column: "name",
          value: data.name,
          message: "שמירת הלקוח נכשלה (ייתכן כפילות או הרשאה חסרה).",
        });
        continue;
      }

      imported += 1;
    }

    const failed = issues.length;
    if (failed > 0) {
      return {
        success: false,
        message: `הייבוא הסתיים עם שגיאות: ${imported} הצליחו, ${failed} נכשלו.`,
        data: { imported, failed, issues },
      };
    }

    return {
      success: true,
      message: `הייבוא הסתיים בהצלחה. נקלטו ${imported} לקוחות.`,
      data: { imported, failed: 0, issues: [] },
    };
  } catch (error) {
    console.error("importClientsFromCsvForm failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}
