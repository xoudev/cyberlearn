/**
 * CSV as a French spreadsheet opens it: semicolons between cells and a
 * byte-order mark in front, which it reads as columns and as UTF-8 without
 * asking. Every cell is quoted.
 *
 * Written for the console's audit export; the class export of the site reads
 * it from here rather than carrying a second copy of the formula guard.
 */

export const CSV_BOM = "﻿";
const SEPARATOR = ";";

/**
 * One cell, quoted. A value a spreadsheet would read as a formula (=, +, -,
 * @, or a tab or carriage return first) gets a leading apostrophe: the cells
 * hold text people typed, a display name or a lesson title, and opening an
 * export must not run it.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/u.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/gu, '""')}"`;
}

export function csvLine(cells: readonly string[]): string {
  return `${cells.map(csvCell).join(SEPARATOR)}\r\n`;
}

/** A whole file: the mark, then one line per row. */
export function csvFile(rows: readonly (readonly string[])[]): string {
  return CSV_BOM + rows.map(csvLine).join("");
}
