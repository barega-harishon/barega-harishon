export function sanitizeStorageFileName(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").slice(0, 120);
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned.length > 0 ? cleaned : "file";
}

export function buildObjectPath(projectId: string, safeFileName: string): string {
  return `${projectId}/${Date.now()}_${safeFileName}`;
}
