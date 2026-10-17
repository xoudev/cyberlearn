/**
 * The rows of a hex dump (HexEditor, PacketDissector): sixteen bytes a row,
 * the way every dump tool prints them, eight where sixteen do not fit, four
 * on a phone.
 *
 * A row is its offset, its bytes and the characters they spell, side by side,
 * and it does not wrap. Too wide for its box, the dump scrolled sideways, and
 * the characters, the part that gives a hidden string away, were the part off
 * screen. A row of sixteen does not fit a tablet in portrait, nor a row of
 * eight a phone: a 375px phone leaves the dump about 310px.
 *
 * Both labs draw their rows with the measures below, and the rows are cut by
 * the same measures, against the dump's own width (useElementWidth): the
 * longest row that fits is the one printed.
 */

/** The measures of a row, in pixels, as both labs draw it. */
export const DUMP = {
  /** Around the rows, inside the dump's rule. */
  padding: 10,
  /** Between the offset, the bytes and the characters. */
  columnGap: 10,
  /** A byte's cell. */
  cellWidth: 26,
  /** Between two cells. */
  cellGap: 3,
  /** Added after the eighth byte of a row of sixteen, where a dump leaves a gap. */
  halfGap: 8,
  /** The monospace the row is written in. */
  fontSize: 13,
} as const;

/** A character's advance in that monospace: 0.6em, JetBrains Mono's and the fallbacks'. */
const CHAR_WIDTH = DUMP.fontSize * 0.6;

export type BytesPerRow = 4 | 8 | 16;

const ROW_LENGTHS: readonly BytesPerRow[] = [16, 8, 4];

/** The width a row of `perRow` bytes takes, behind an offset `offsetWidth` pixels wide. */
export function rowWidth(perRow: BytesPerRow, offsetWidth: number): number {
  const cells =
    perRow * DUMP.cellWidth + (perRow - 1) * DUMP.cellGap + (perRow === 16 ? DUMP.halfGap : 0);
  return (
    2 * DUMP.padding + offsetWidth + DUMP.columnGap + cells + DUMP.columnGap + perRow * CHAR_WIDTH
  );
}

/**
 * Bytes a row for a dump `width` pixels wide, whose offsets take `offsetWidth`:
 * the longest row that fits, four where none does. Sixteen until the dump is
 * measured.
 */
export function bytesPerRow(width: number | null, offsetWidth: number): BytesPerRow {
  if (width === null) return 16;
  return ROW_LENGTHS.find((perRow) => rowWidth(perRow, offsetWidth) <= width) ?? 4;
}

/** The offset each row starts at. */
export function rowStarts(length: number, perRow: BytesPerRow): number[] {
  const starts: number[] = [];
  for (let at = 0; at < length; at += perRow) starts.push(at);
  return starts;
}

/**
 * Whether the byte at `offset` closes the first half of a row of sixteen, where
 * a dump leaves a gap. A row of eight is one half, a row of four a quarter: no
 * gap in them.
 */
export function endsHalfRow(offset: number, perRow: BytesPerRow): boolean {
  return perRow === 16 && offset % 16 === 7;
}
