import { z } from "zod";

import { sanitizeText } from "@/utils/sanitize";

/** אפשרויות צבע חיפוי (שטיח / בד) — ערכים נשמרים כטקסט ב־DB */
export const CLADDING_SWATCH_OPTIONS = [
  { label: "שחור", value: "שחור", code: "RAL 9005", hex: "#0A0A0A" },
  { label: "אפור כהה", value: "אפור כהה", code: "RAL 7016", hex: "#30343F" },
  { label: "כחול נייבי", value: "כחול נייבי", code: "RAL 5003", hex: "#1D2C55" },
  { label: "כחול רויאל", value: "כחול רויאל", code: "RAL 5002", hex: "#123F8A" },
  { label: "לבן", value: "לבן", code: "RAL 9016", hex: "#F5F7FA" },
] as const;

export type CladdingSwatchValue = (typeof CLADDING_SWATCH_OPTIONS)[number]["value"];

const CLADDING_VALUE_SET: Set<string> = new Set(
  CLADDING_SWATCH_OPTIONS.map((o) => o.value as string),
);

/** ולידציה לטופס: ריק או אחד מהערכים המוגדרים */
export const zCladdingSwatchField = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : ""),
  z
    .string()
    .max(80)
    .refine((s) => s === "" || CLADDING_VALUE_SET.has(s), {
      message: "נא לבחור צבע מהרשימה.",
    })
    .transform((s) => (s ? sanitizeText(s) : "")),
);
