/**
 * A timestamp as the Data API returns it. The columns are `timestamp without
 * time zone` holding UTC, so the text carries no offset, and `new Date()` on a
 * phone would read it as local time, hours off. Read as UTC unless it says
 * otherwise.
 */
export function dbTime(value: string): Date {
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/u.test(value) ? value : `${value}Z`);
}
