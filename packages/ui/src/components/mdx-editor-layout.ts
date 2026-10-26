/**
 * How the lesson editor shares its width, and how its preview is framed:
 * remembered per browser, so an author who wants a wide preview, or writes for
 * the phone, finds it that way on the next lesson.
 *
 * Kept in localStorage, which may be unavailable (a private window, storage
 * blocked) or hold anything at all: every read falls back to the default and
 * every write may fail without consequence. Neither is worth a server round
 * trip; both are a convenience of this browser.
 */

/** The editor's share of the panel, in percent, around the separator. */
export const SPLIT_DEFAULT = 55;
export const SPLIT_MIN = 25;
export const SPLIT_MAX = 75;
/** How far an arrow key moves the separator. */
export const SPLIT_STEP = 2;
/**
 * Narrower than this, a panel opens on the editor alone. Side by side, each
 * half of a phone is under 200px and of a tablet held upright (472px in the
 * console) under 260px: Monaco shows a few words a line and the preview of the
 * site is laid out as a sliver of it. A laptop's studio, 600px and more, keeps
 * both halves. The split button brings the preview back.
 */
export const SPLIT_MIN_PANEL_WIDTH = 520;

const SPLIT_KEY = "cl-mdx-editor-split";
const DEVICE_KEY = "cl-mdx-preview-device";

/** The widths the site's preview is framed at. */
export type PreviewDevice = "desktop" | "mobile";

/**
 * The phone's width, in CSS pixels: a common one, under the site's mobile
 * breakpoint, so the framed page lays itself out as on a phone.
 */
export const MOBILE_PREVIEW_WIDTH = 390;

/** A share the separator may take, from anything: out of range is brought back in. */
export function clampSplit(percent: number): number {
  if (!Number.isFinite(percent)) return SPLIT_DEFAULT;
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, Math.round(percent * 10) / 10));
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage refused: the choice lasts as long as the page.
  }
}

/** The share this browser kept, or null for none (or one that is not a number). */
export function readStoredSplit(): number | null {
  const stored = read(SPLIT_KEY);
  if (stored === null) return null;
  const value = Number(stored);
  return Number.isFinite(value) ? clampSplit(value) : null;
}

export function storeSplit(percent: number): void {
  write(SPLIT_KEY, String(clampSplit(percent)));
}

export function readStoredDevice(): PreviewDevice | null {
  const stored = read(DEVICE_KEY);
  return stored === "desktop" || stored === "mobile" ? stored : null;
}

export function storeDevice(device: PreviewDevice): void {
  write(DEVICE_KEY, device);
}

/**
 * Whether a panel of this width opens with the preview beside the editor. A
 * width not measured (no layout yet, or none at all) leaves the default.
 */
export function opensSplit(panelWidth: number): boolean {
  if (!Number.isFinite(panelWidth) || panelWidth <= 0) return true;
  return panelWidth >= SPLIT_MIN_PANEL_WIDTH;
}

/** The editor's share for a pointer at `clientX`, over a panel starting at `left` and `width` wide. */
export function splitAt(clientX: number, left: number, width: number): number {
  if (width <= 0) return SPLIT_DEFAULT;
  return clampSplit(((clientX - left) / width) * 100);
}
