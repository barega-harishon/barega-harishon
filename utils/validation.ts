import { z } from "zod";

import { normalizeEmail, sanitizeText } from "@/utils/sanitize";

export const contactSchema = z.object({
  fullName: z
    .string()
    .min(2, "שם מלא חייב להכיל לפחות 2 תווים")
    .max(80, "שם מלא ארוך מדי")
    .transform((value) => sanitizeText(value)),
  email: z
    .string()
    .email("כתובת דוא״ל אינה תקינה")
    .transform((value) => normalizeEmail(value)),
  message: z
    .string()
    .min(5, "ההודעה חייבת להכיל לפחות 5 תווים")
    .max(1000, "ההודעה ארוכה מדי")
    .transform((value) => sanitizeText(value)),
});

export type ContactInput = z.infer<typeof contactSchema>;
