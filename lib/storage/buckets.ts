export const SITE_PHOTOS_BUCKET = "project-site-photos";
export const SKETCHES_BUCKET = "project-sketches";
export const EMPLOYEE_FILES_BUCKET = "employee-files";

export const MAX_SITE_PHOTO_BYTES = 20 * 1024 * 1024;
export const MAX_SKETCH_BYTES = 20 * 1024 * 1024;
export const MAX_EMPLOYEE_FILE_BYTES = 10 * 1024 * 1024;

export const SITE_PHOTO_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const SKETCH_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const EMPLOYEE_FILE_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
