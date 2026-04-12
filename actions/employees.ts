"use server";

import { z } from "zod";

import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import { buildObjectPath, sanitizeStorageFileName } from "@/lib/storage/file-names";
import {
  EMPLOYEE_FILES_BUCKET,
  EMPLOYEE_FILE_MIME,
  MAX_EMPLOYEE_FILE_BYTES,
} from "@/lib/storage/buckets";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import type { EmployeeRow, EmployeeType } from "@/types/employees";
import { sanitizeText } from "@/utils/sanitize";

const employeeTypeSchema = z.enum(["fixed", "hourly", "agency"]);

/** שדות טקסט מהטופס — תמיד מחרוזת (גם ריקה) */
const optStr = (max: number) => z.string().max(max).transform((s) => sanitizeText(s));

const createEmployeeSchema = z.object({
  name: z
    .string()
    .min(2, "שם חייב להכיל לפחות 2 תווים")
    .max(120)
    .transform((v) => sanitizeText(v)),
  type: employeeTypeSchema,
  hourlyRate: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") {
      return undefined;
    }
    const n = typeof v === "number" ? v : Number(v);
    return Number.isNaN(n) ? undefined : n;
  }, z.number().min(0).max(99999).optional()),
  availabilityNote: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v ? sanitizeText(v) : "")),
  phone: optStr(40),
  email: optStr(200),
  nationalId: optStr(20),
  bankName: optStr(120),
  bankBranch: optStr(40),
  bankAccountNumber: optStr(40),
  bankAccountHolder: optStr(120),
  documentsNotes: optStr(4000),
  licensesNotes: optStr(4000),
});

function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = "code" in error ? (error as { code?: string }).code : undefined;
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return code === "42703" || message.includes("column") || message.includes("does not exist");
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = "code" in error ? (error as { code?: string }).code : undefined;
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return code === "42P01" || message.includes("relation") || message.includes("does not exist");
}

function serializeDbError(error: unknown): Record<string, string | null> {
  if (!error || typeof error !== "object") {
    return {
      code: null,
      message: String(error ?? "unknown"),
      details: null,
      hint: null,
    };
  }
  const e = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  return {
    code: typeof e.code === "string" ? e.code : null,
    message: typeof e.message === "string" ? e.message : null,
    details: typeof e.details === "string" ? e.details : null,
    hint: typeof e.hint === "string" ? e.hint : null,
  };
}

function formatDbErrorForLog(error: unknown): string {
  const s = serializeDbError(error);
  const parts = [
    s.code ? `code=${s.code}` : null,
    s.message ? `message=${s.message}` : null,
    s.details ? `details=${s.details}` : null,
    s.hint ? `hint=${s.hint}` : null,
  ].filter((p): p is string => Boolean(p));

  if (parts.length > 0) {
    return parts.join(" | ");
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error ?? "unknown");
  }
}

type EmployeeFileEventType = "upload_documents" | "upload_licenses" | "delete_documents" | "delete_licenses";

async function logEmployeeFileEvent(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  input: { employeeId: string; eventType: EmployeeFileEventType; filePath: string; actorUserId: string | null },
): Promise<void> {
  const { error } = await supabase.from("employee_file_events").insert({
    employee_id: input.employeeId,
    event_type: input.eventType,
    file_path: input.filePath,
    actor_user_id: input.actorUserId,
  });
  if (error) {
    console.error("logEmployeeFileEvent failed", serializeDbError(error));
  }
}

export async function listEmployeeFileEvents(employeeId: string): Promise<
  Array<{
    id: string;
    event_type: string;
    file_path: string;
    actor_user_id: string | null;
    actor_name: string | null;
    created_at: string;
  }>
> {
  const parsed = z.string().uuid().safeParse(employeeId);
  if (!parsed.success) {
    return [];
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("employee_file_events")
    .select("id, event_type, file_path, actor_user_id, created_at")
    .eq("employee_id", parsed.data)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    console.error("listEmployeeFileEvents failed", serializeDbError(error));
    return [];
  }
  const base = (data ?? []) as Array<{
    id: string;
    event_type: string;
    file_path: string;
    actor_user_id: string | null;
    created_at: string;
  }>;

  const actorIds = [...new Set(base.map((e) => e.actor_user_id).filter((v): v is string => Boolean(v)))];
  let namesById = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);

    if (Array.isArray(profiles)) {
      namesById = new Map(
        profiles
          .filter(
            (p): p is { id: string; full_name: string } =>
              typeof p?.id === "string" && typeof p?.full_name === "string",
          )
          .map((p) => [p.id, p.full_name]),
      );
    }
  }

  return base.map((e) => ({
    ...e,
    actor_name: e.actor_user_id ? namesById.get(e.actor_user_id) ?? null : null,
  }));
}

function withNullExtendedFields(rows: Array<Record<string, unknown>>): EmployeeRow[] {
  return rows.map((row) => ({
    ...(row as Omit<
      EmployeeRow,
      | "auth_user_id"
      | "phone"
      | "email"
      | "national_id"
      | "bank_name"
      | "bank_branch"
      | "bank_account_number"
      | "bank_account_holder"
      | "documents_notes"
      | "licenses_notes"
      | "documents_paths"
      | "licenses_paths"
    >),
    auth_user_id: null,
    phone: null,
    email: null,
    national_id: null,
    bank_name: null,
    bank_branch: null,
    bank_account_number: null,
    bank_account_holder: null,
    documents_notes: null,
    licenses_notes: null,
    documents_paths: null,
    licenses_paths: null,
  }));
}

function collectFormFiles(formData: FormData, key: string): File[] {
  return formData.getAll(key).filter((f): f is File => f instanceof File && f.size > 0);
}

function validateEmployeeUploadFiles(files: File[]): string | null {
  if (files.length > 8) {
    return "אפשר להעלות עד 8 קבצים בכל קטגוריה.";
  }
  for (const file of files) {
    if (file.size > MAX_EMPLOYEE_FILE_BYTES) {
      return "קובץ גדול מדי (מקסימום 10MB לקובץ).";
    }
    if (!EMPLOYEE_FILE_MIME.has(file.type)) {
      return "סוג קובץ לא נתמך. ניתן להעלות PDF, תמונות, Word או טקסט.";
    }
  }
  return null;
}

async function uploadEmployeeFiles(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  employeeId: string,
  files: File[],
): Promise<ActionResult<{ paths: string[] }>> {
  if (files.length === 0) {
    return { success: true, message: "אין קבצים להעלאה.", data: { paths: [] } };
  }

  const uploaded: string[] = [];
  for (const file of files) {
    const safeName = sanitizeStorageFileName(file.name);
    const objectPath = buildObjectPath(employeeId, safeName);
    const { error } = await supabase.storage.from(EMPLOYEE_FILES_BUCKET).upload(objectPath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      console.error("uploadEmployeeFiles storage error", serializeDbError(error));
      return { success: false, message: getSafeClientErrorMessage() };
    }
    uploaded.push(objectPath);
  }
  return { success: true, message: "הקבצים הועלו.", data: { paths: uploaded } };
}

export async function listEmployees(): Promise<EmployeeRow[]> {
  const supabase = await createServerSupabaseClient();
  const fullSelect = await supabase
    .from("employees")
    .select(
      "id, auth_user_id, name, type, hourly_rate, availability_note, created_at, phone, email, national_id, bank_name, bank_branch, bank_account_number, bank_account_holder, documents_notes, licenses_notes, documents_paths, licenses_paths",
    )
    .order("name", { ascending: true });

  if (!fullSelect.error && fullSelect.data) {
    return fullSelect.data as EmployeeRow[];
  }

  // Backward-compatible fallback when prod DB is missing latest team fields migration.
  if (isMissingColumnError(fullSelect.error) || isMissingRelationError(fullSelect.error)) {
    const legacySelect = await supabase
      .from("employees")
      .select("id, name, type, hourly_rate, availability_note, created_at")
      .order("name", { ascending: true });
    if (!legacySelect.error && legacySelect.data) {
      return withNullExtendedFields(legacySelect.data as Array<Record<string, unknown>>);
    }
    if (legacySelect.error) {
      console.error(
        "listEmployees legacy fallback failed",
        formatDbErrorForLog(legacySelect.error),
      );
      return [];
    }
  }

  if (fullSelect.error) {
    console.error("listEmployees failed", formatDbErrorForLog(fullSelect.error));
    return [];
  }

  return [];
}

export async function listEmployeesWithHealth(): Promise<{
  rows: EmployeeRow[];
  loadError: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const fullSelect = await supabase
    .from("employees")
    .select(
      "id, auth_user_id, name, type, hourly_rate, availability_note, created_at, phone, email, national_id, bank_name, bank_branch, bank_account_number, bank_account_holder, documents_notes, licenses_notes, documents_paths, licenses_paths",
    )
    .order("name", { ascending: true });

  if (!fullSelect.error && fullSelect.data) {
    return { rows: fullSelect.data as EmployeeRow[], loadError: null };
  }

  if (isMissingColumnError(fullSelect.error) || isMissingRelationError(fullSelect.error)) {
    const legacySelect = await supabase
      .from("employees")
      .select("id, name, type, hourly_rate, availability_note, created_at")
      .order("name", { ascending: true });
    if (!legacySelect.error && legacySelect.data) {
      return {
        rows: withNullExtendedFields(legacySelect.data as Array<Record<string, unknown>>),
        loadError: "טבלת הצוות נטענה במצב תאימות (חסרים שדות חדשים). מומלץ להריץ מיגרציות.",
      };
    }
    if (legacySelect.error) {
      console.error(
        "listEmployeesWithHealth legacy fallback failed",
        formatDbErrorForLog(legacySelect.error),
      );
      return {
        rows: [],
        loadError:
          "טעינת טבלת הצוות נכשלה. בדקו הרשאות/מיגרציות ב־Supabase ונסו שוב.",
      };
    }
  }

  if (fullSelect.error) {
    console.error("listEmployeesWithHealth failed", formatDbErrorForLog(fullSelect.error));
    return {
      rows: [],
      loadError: "טעינת טבלת הצוות נכשלה. בדקו חיבור DB והריצו מיגרציות נדרשות.",
    };
  }

  return { rows: [], loadError: null };
}

export async function getEmployeeById(employeeId: string): Promise<EmployeeRow | null> {
  const parsed = z.string().uuid().safeParse(employeeId);
  if (!parsed.success) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const fullSelect = await supabase
    .from("employees")
    .select(
      "id, auth_user_id, name, type, hourly_rate, availability_note, created_at, phone, email, national_id, bank_name, bank_branch, bank_account_number, bank_account_holder, documents_notes, licenses_notes, documents_paths, licenses_paths",
    )
    .eq("id", parsed.data)
    .maybeSingle();

  if (!fullSelect.error && fullSelect.data) {
    return fullSelect.data as EmployeeRow;
  }

  if (isMissingColumnError(fullSelect.error) || isMissingRelationError(fullSelect.error)) {
    const legacySelect = await supabase
      .from("employees")
      .select("id, name, type, hourly_rate, availability_note, created_at")
      .eq("id", parsed.data)
      .maybeSingle();
    if (!legacySelect.error && legacySelect.data) {
      return withNullExtendedFields([legacySelect.data as Record<string, unknown>])[0] ?? null;
    }
  }

  if (fullSelect.error) {
    console.error("getEmployeeById failed", serializeDbError(fullSelect.error));
  }
  return null;
}

export async function createEmployee(
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createEmployeeSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: "יש שדות לא תקינים." };
  }

  const d = parsed.data;

  const toNull = (s: string) => (s.length > 0 ? s : null);

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("employees")
      .insert({
        name: d.name,
        type: d.type as EmployeeType,
        hourly_rate:
          d.type === "hourly" && d.hourlyRate !== undefined ? d.hourlyRate : null,
        availability_note: toNull(d.availabilityNote),
        phone: toNull(d.phone),
        email: toNull(d.email),
        national_id: toNull(d.nationalId),
        bank_name: toNull(d.bankName),
        bank_branch: toNull(d.bankBranch),
        bank_account_number: toNull(d.bankAccountNumber),
        bank_account_holder: toNull(d.bankAccountHolder),
        documents_notes: toNull(d.documentsNotes),
        licenses_notes: toNull(d.licensesNotes),
        documents_paths: [],
        licenses_paths: [],
      })
      .select("id")
      .single();

    if (error || !data) {
      if (isMissingColumnError(error)) {
        return {
          success: false,
          message:
            "מבנה טבלת הצוות טרם עודכן. הריצו מיגרציה חדשה ב-Supabase ואז נסו שוב.",
        };
      }
      return { success: false, message: getSafeClientErrorMessage() };
    }

    return {
      success: true,
      message: "החבר נוסף לצוות.",
      data: { id: data.id as string },
    };
  } catch (error) {
    console.error("createEmployee failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

function fd(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function createEmployeeFromForm(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }> | null> {
  const documentsFiles = collectFormFiles(formData, "documentsFiles");
  const licensesFiles = collectFormFiles(formData, "licensesFiles");

  const filesValidationErr =
    validateEmployeeUploadFiles(documentsFiles) ?? validateEmployeeUploadFiles(licensesFiles);
  if (filesValidationErr) {
    return { success: false, message: filesValidationErr };
  }

  const created = await createEmployee({
    name: formData.get("name"),
    type: formData.get("type"),
    hourlyRate: formData.get("hourlyRate"),
    availabilityNote: formData.get("availabilityNote"),
    phone: fd(formData, "phone"),
    email: fd(formData, "email"),
    nationalId: fd(formData, "nationalId"),
    bankName: fd(formData, "bankName"),
    bankBranch: fd(formData, "bankBranch"),
    bankAccountNumber: fd(formData, "bankAccountNumber"),
    bankAccountHolder: fd(formData, "bankAccountHolder"),
    documentsNotes: fd(formData, "documentsNotes"),
    licensesNotes: fd(formData, "licensesNotes"),
  });

  if (!created.success || !created.data?.id) {
    return created;
  }

  if (documentsFiles.length === 0 && licensesFiles.length === 0) {
    return created;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const docsUpload = await uploadEmployeeFiles(supabase, created.data.id, documentsFiles);
    if (!docsUpload.success) {
      return {
        ...created,
        message: `${created.message} העובד נשמר, אבל העלאת קבצי מסמכים נכשלה.`,
      };
    }

    const licensesUpload = await uploadEmployeeFiles(supabase, created.data.id, licensesFiles);
    if (!licensesUpload.success) {
      return {
        ...created,
        message: `${created.message} העובד נשמר, אבל העלאת קבצי רישיונות נכשלה.`,
      };
    }

    const { error: updateError } = await supabase
      .from("employees")
      .update({
        documents_paths: docsUpload.data?.paths ?? [],
        licenses_paths: licensesUpload.data?.paths ?? [],
      })
      .eq("id", created.data.id);

    if (updateError) {
      console.error("createEmployeeFromForm files update failed", serializeDbError(updateError));
      return {
        ...created,
        message: `${created.message} הקבצים הועלו, אבל שיוך הקבצים לעובד נכשל.`,
      };
    }

    const actorUserId = user?.id ?? null;
    for (const path of docsUpload.data?.paths ?? []) {
      await logEmployeeFileEvent(supabase, {
        employeeId: created.data.id,
        eventType: "upload_documents",
        filePath: path,
        actorUserId,
      });
    }
    for (const path of licensesUpload.data?.paths ?? []) {
      await logEmployeeFileEvent(supabase, {
        employeeId: created.data.id,
        eventType: "upload_licenses",
        filePath: path,
        actorUserId,
      });
    }

    return {
      ...created,
      message: `${created.message} כולל העלאת קבצים.`,
    };
  } catch (error) {
    console.error("createEmployeeFromForm files flow failed", toServerError(error));
    return {
      ...created,
      message: `${created.message} הקבצים לא הועלו עקב שגיאת שרת.`,
    };
  }
}

export async function addEmployeeFilesFromForm(
  _prev: ActionResult<{ added: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ added: number }> | null> {
  const employeeId = formData.get("employeeId");
  const category = formData.get("category");

  const parsed = z
    .object({
      employeeId: z.string().uuid(),
      category: z.enum(["documents", "licenses"]),
    })
    .safeParse({
      employeeId: typeof employeeId === "string" ? employeeId : "",
      category: typeof category === "string" ? category : "",
    });

  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }

  const files = collectFormFiles(formData, "files");
  if (files.length === 0) {
    return { success: false, message: "נא לבחור קובץ אחד לפחות." };
  }

  const fileErr = validateEmployeeUploadFiles(files);
  if (fileErr) {
    return { success: false, message: fileErr };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "נדרשת התחברות." };
    }

    const field = parsed.data.category === "documents" ? "documents_paths" : "licenses_paths";
    const { data: row, error: rowError } = await supabase
      .from("employees")
      .select("documents_paths, licenses_paths")
      .eq("id", parsed.data.employeeId)
      .maybeSingle();
    if (rowError || !row) {
      console.error("addEmployeeFilesFromForm fetch row failed", serializeDbError(rowError));
      return { success: false, message: getSafeClientErrorMessage() };
    }

    const uploadResult = await uploadEmployeeFiles(supabase, parsed.data.employeeId, files);
    if (!uploadResult.success) {
      return { success: false, message: uploadResult.message };
    }

    const currentPaths = Array.isArray(row[field]) ? (row[field] as string[]) : [];
    const nextPaths = [...new Set([...currentPaths, ...(uploadResult.data?.paths ?? [])])].slice(0, 80);
    const { error: updateError } = await supabase
      .from("employees")
      .update({ [field]: nextPaths })
      .eq("id", parsed.data.employeeId);
    if (updateError) {
      console.error("addEmployeeFilesFromForm update failed", serializeDbError(updateError));
      return { success: false, message: "הקבצים הועלו, אבל העדכון בכרטיס העובד נכשל." };
    }

    const actorUserId = user.id;
    const eventType: EmployeeFileEventType =
      parsed.data.category === "documents" ? "upload_documents" : "upload_licenses";
    for (const path of uploadResult.data?.paths ?? []) {
      await logEmployeeFileEvent(supabase, {
        employeeId: parsed.data.employeeId,
        eventType,
        filePath: path,
        actorUserId,
      });
    }

    return {
      success: true,
      message: `הועלו ${uploadResult.data?.paths?.length ?? 0} קבצים.`,
      data: { added: uploadResult.data?.paths?.length ?? 0 },
    };
  } catch (error) {
    console.error("addEmployeeFilesFromForm failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}

export async function removeEmployeeFile(
  payload: unknown,
): Promise<ActionResult<Record<string, never>>> {
  const parsed = z
    .object({
      employeeId: z.string().uuid(),
      category: z.enum(["documents", "licenses"]),
      path: z.string().min(3).max(500),
    })
    .safeParse(payload);

  if (!parsed.success) {
    return { success: false, message: "בקשה לא תקינה." };
  }

  const { employeeId, category, path } = parsed.data;
  if (!path.startsWith(`${employeeId}/`) || path.includes("..")) {
    return { success: false, message: "נתיב קובץ לא תקין." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "נדרשת התחברות." };
    }

    const { data: row, error: rowError } = await supabase
      .from("employees")
      .select("documents_paths, licenses_paths")
      .eq("id", employeeId)
      .maybeSingle();

    if (rowError || !row) {
      console.error("removeEmployeeFile fetch row failed", serializeDbError(rowError));
      return { success: false, message: getSafeClientErrorMessage() };
    }

    const field = category === "documents" ? "documents_paths" : "licenses_paths";
    const currentPaths = Array.isArray(row[field]) ? (row[field] as string[]) : [];
    if (!currentPaths.includes(path)) {
      return { success: false, message: "הקובץ לא משויך לעובד." };
    }

    const { error: removeError } = await supabase.storage.from(EMPLOYEE_FILES_BUCKET).remove([path]);
    if (removeError) {
      console.error("removeEmployeeFile storage remove failed", serializeDbError(removeError));
      return { success: false, message: getSafeClientErrorMessage() };
    }

    const nextPaths = currentPaths.filter((p) => p !== path);
    const { error: updateError } = await supabase
      .from("employees")
      .update({ [field]: nextPaths })
      .eq("id", employeeId);

    if (updateError) {
      console.error("removeEmployeeFile update row failed", serializeDbError(updateError));
      return { success: false, message: getSafeClientErrorMessage() };
    }

    await logEmployeeFileEvent(supabase, {
      employeeId,
      eventType: category === "documents" ? "delete_documents" : "delete_licenses",
      filePath: path,
      actorUserId: user.id,
    });

    return { success: true, message: "הקובץ הוסר." };
  } catch (error) {
    console.error("removeEmployeeFile failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}
