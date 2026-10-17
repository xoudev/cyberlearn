/**
 * The rows of a hex dump (HexEditor, PacketDissector): sixteen bytes a row,
 * the way every dump tool prints them, or eight where sixteen do not fit.
 *
 * A row of sixteen, with its offset, the gap after the eighth byte and the
 * sixteen characters they spell, is about 690px of 13px monospace. Under that
 * the dump scrolled sideways on every phone and tablet in portrait, and the
 * characters, the part that gives a hidden string away, were the part off
 * screen. Eight a row is half as wide. The rows are cut in script, so it is
 * the dump's own width that decides, measured (useElementWidth).
 */

/** The width of the dump's box from which a row of sixteen bytes fits. */
export const SIXTEEN_BYTES_MIN_WIDTH = 720;

export type BytesPerRow = 8 | 16;

/** Bytes a row for a dump `width` pixels wide; sixteen until it is measured. */
export function bytesPerRow(width: number | null): BytesPerRow {
  return width !== null && width < SIXTEEN_BYTES_MIN_WIDTH ? 8 : 16;
}

/** The offset each row starts at. */
export function rowStarts(length: number, perRow: BytesPerRow): number[] {
  const starts: number[] = [];
  for (let at = 0; at < length; at += perRow) starts.push(at);
  return starts;
}

/**
 * Whether the byte at `offset` closes the first half of a row of sixteen, where
 * a dump leaves a gap. A row of eight is one half: no gap in it.
 */
export function endsHalfRow(offset: number, perRow: BytesPerRow): boolean {
  return perRow === 16 && offset % 16 === 7;
}
