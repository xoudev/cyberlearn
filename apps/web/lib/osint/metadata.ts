/**
 * A photo's metadata, read from its bytes as an investigator's tool would
 * (exifr, in the browser), and shown as exiftool prints it: raw values, so a
 * date keeps the camera's clock instead of the reader's time zone.
 */

export interface MetadataRow {
  /** The French label, then the tag as exiftool names it. */
  readonly label: string;
  readonly tag: string;
  readonly value: string;
}

type Raw = Record<string, unknown>;

function text(value: unknown): string | null {
  if (typeof value === "string") return value.replace(/\0+$/u, "").trim() || null;
  if (typeof value === "number") return String(value);
  return null;
}

/** [45, 53, 57.12] and "N" as 45° 53' 57.12" N. */
function dms(value: unknown, ref: unknown): string | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const [d, m, s] = value.map((v) => (typeof v === "number" ? v : Number.NaN));
  if (d === undefined || m === undefined || s === undefined || [d, m, s].some(Number.isNaN)) {
    return null;
  }
  const seconds = Math.round(s * 100) / 100;
  return `${String(d)}° ${String(m)}' ${String(seconds)}" ${text(ref) ?? ""}`.trim();
}

/** The rows an investigator looks at first, in the order exiftool prints them. */
export function metadataRows(raw: Raw | null | undefined): MetadataRow[] {
  if (!raw) return [];
  const rows: MetadataRow[] = [];
  const add = (label: string, tag: string, value: string | null): void => {
    if (value !== null) rows.push({ label, tag, value });
  };
  add("Fabricant", "Make", text(raw.Make));
  add("Appareil", "Camera Model Name", text(raw.Model));
  add("Logiciel", "Software", text(raw.Software));
  add("Prise de vue", "Date/Time Original", text(raw.DateTimeOriginal));
  add("Latitude", "GPS Latitude", dms(raw.GPSLatitude, raw.GPSLatitudeRef));
  add("Longitude", "GPS Longitude", dms(raw.GPSLongitude, raw.GPSLongitudeRef));
  const altitude = typeof raw.GPSAltitude === "number" ? `${String(raw.GPSAltitude)} m` : null;
  add("Altitude", "GPS Altitude", altitude);
  return rows;
}

/** The options that keep the values as the file holds them. */
export const RAW_EXIF_OPTIONS = {
  tiff: true,
  exif: true,
  gps: true,
  ifd1: false,
  xmp: false,
  icc: false,
  iptc: false,
  translateKeys: true,
  translateValues: false,
  reviveValues: false,
} as const;

/** Reads a picture's metadata from its bytes; no tag at all reads as []. */
export async function readMetadata(bytes: ArrayBuffer): Promise<MetadataRow[]> {
  const exifr = (await import("exifr")).default;
  const raw: unknown = await exifr.parse(bytes, RAW_EXIF_OPTIONS);
  // SAFETY: exifr returns a plain object of tags; each is narrowed as it is read.
  return metadataRows(typeof raw === "object" && raw !== null ? (raw as Raw) : null);
}
