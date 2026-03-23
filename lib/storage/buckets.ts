export const SITE_PHOTOS_BUCKET = "project-site-photos";
export const SKETCHES_BUCKET = "project-sketches";

export const MAX_SITE_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_SKETCH_BYTES = 8 * 1024 * 1024;

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
