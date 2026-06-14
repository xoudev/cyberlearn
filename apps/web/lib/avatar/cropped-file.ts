// Client-safe helper: wrap a cropped avatar Blob (from the canvas exporter) in a
// File so it can be appended to FormData. The server action validates the type
// and magic bytes regardless of this name.
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export function croppedBlobToFile(blob: Blob): File {
  const type = blob.type || "image/webp";
  const ext = EXTENSION_BY_TYPE[type] ?? "webp";
  return new File([blob], `avatar.${ext}`, { type });
}
