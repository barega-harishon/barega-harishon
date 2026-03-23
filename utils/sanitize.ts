export function sanitizeText(value: string): string {
  return value.replace(/[<>]/g, "").trim();
}

export function normalizeEmail(value: string): string {
  return sanitizeText(value).toLowerCase();
}
