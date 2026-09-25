/**
 * Timestamps as the Data API returns them. The columns are `timestamp without
 * time zone` holding UTC, so the text carries no offset ("2026-09-24T10:00:00.123",
 * sometimes without the fraction), and `new Date()` on a phone reads that as
 * local time: two hours early in Paris in the summer. A review showed as due
 * before the server agreed, a ban ended early on screen, a notification said
 * "il y a 2 h" the moment it arrived.
 *
 * Every timestamp read straight from the database goes through here as it is
 * read, so the rest of the app only ever sees ISO strings with their "Z".
 * Timestamps from /api/mobile/* already carry it (toISOString on the server).
 */

const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/u;

/** A database timestamp as a Date, read as UTC unless it says otherwise. */
export function dbTime(value: string): Date {
  return new Date(HAS_OFFSET.test(value) ? value : `${value}Z`);
}

/** A database timestamp as an ISO string with its "Z". */
export function dbIso(value: string): string {
  return dbTime(value).toISOString();
}

export function dbIsoOrNull(value: string | null): string | null {
  return value === null ? null : dbIso(value);
}
