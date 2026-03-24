"use server";

import { z } from "zod";
import * as XLSX from "xlsx";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSafeClientErrorMessage, toServerError } from "@/lib/errors";
import type { ActionResult } from "@/types/common";
import { getCurrentAppRole } from "@/lib/auth/current-profile";
import { isOfficeOrAdminRole } from "@/types/app-role";
import { sanitizeText } from "@/utils/sanitize";

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

const rowSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().max(100).optional(),
  total_qty: z.coerce.number().int().min(0).max(999_999),
  rent_price: z.coerce.number().min(0).max(99_999_999),
  warehouse_location: z.string().max(200).optional(),
  purchased_at: z.string().optional(),
  purchase_quantity: z.coerce.number().int().min(1).max(1_000_000).optional(),
  unit_cost: z.coerce.number().min(0).max(99_999_999).optional(),
  supplier_name: z.string().max(120).optional(),
  reference_no: z.string().max(120).optional(),
  note: z.string().max(2000).optional(),
});

export async function importEquipmentFromCsvForm(
  _prev: ActionResult<{ imported: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ imported: number }> | null> {
  try {
    const role = await getCurrentAppRole();
    if (!isOfficeOrAdminRole(role) && role !== "warehouse") {
      return { success: false, message: "אין הרשאה לייבוא מלאי." };
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

    const rows = isXlsx
      ? parseXlsx(await file.arrayBuffer())
      : parseCsv(await file.text());
    if (rows.length === 0) {
      return { success: false, message: "הקובץ ריק או לא בפורמט תבנית תקין." };
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let imported = 0;
    for (const raw of rows) {
      const parsed = rowSchema.safeParse(raw);
      if (!parsed.success) {
        return {
          success: false,
          message: `שורה לא תקינה בייבוא (שם פריט: ${raw.name || "לא ידוע"}).`,
        };
      }
      const d = parsed.data;

      const { data: inserted, error: insErr } = await supabase
        .from("equipment")
        .insert({
          name: sanitizeText(d.name),
          category: sanitizeText(d.category ?? ""),
          total_qty: d.total_qty,
          rent_price: d.rent_price,
          warehouse_location: d.warehouse_location ? sanitizeText(d.warehouse_location) : null,
        })
        .select("id")
        .single();
      if (insErr || !inserted) {
        return { success: false, message: getSafeClientErrorMessage() };
      }
      imported += 1;

      if (d.purchased_at && d.purchase_quantity && d.unit_cost !== undefined) {
        const { error: batchErr } = await supabase.from("equipment_purchase_batches").insert({
          equipment_id: inserted.id,
          purchased_at: d.purchased_at,
          quantity: d.purchase_quantity,
          unit_cost: d.unit_cost,
          supplier_name: d.supplier_name ? sanitizeText(d.supplier_name) : null,
          reference_no: d.reference_no ? sanitizeText(d.reference_no) : null,
          note: d.note ? sanitizeText(d.note) : null,
          created_by: user?.id ?? null,
        });
        if (batchErr) {
          return { success: false, message: "הציוד נוצר, אך הוספת אצוות מהרשומה נכשלה." };
        }
      }
    }

    return {
      success: true,
      message: `הייבוא הסתיים בהצלחה. נקלטו ${imported} פריטי ציוד.`,
      data: { imported },
    };
  } catch (error) {
    console.error("importEquipmentFromCsvForm failed", toServerError(error));
    return { success: false, message: getSafeClientErrorMessage() };
  }
}
