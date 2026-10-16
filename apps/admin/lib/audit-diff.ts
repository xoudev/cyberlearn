/**
 * Which fields an edit changed, for the audit log: their names, never their
 * values.
 *
 * Names only, on purpose. A challenge's flag is the answer to the challenge,
 * and an audit row is read by every administrator and exported as CSV; "the
 * flag changed" is what the log needs, the flag itself is not. Changing it
 * also invalidates what learners had found, which is why it must show up at
 * all.
 *
 * `after` decides which fields are compared: a field the edit does not touch
 * is not a change. Values are compared as JSON with their keys sorted, since
 * Postgres hands a jsonb column back with its keys in its own order and a
 * reordered object is the same object.
 */
export function changedFields(
  before: Readonly<Record<string, unknown>>,
  after: Readonly<Record<string, unknown>>,
): string[] {
  return Object.keys(after).filter((key) => stableJson(before[key]) !== stableJson(after[key]));
}

/** JSON with object keys sorted at every depth; undefined reads as null. */
function stableJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, inner]) => [key, sortKeys(inner)]),
    );
  }
  return value === undefined ? null : value;
}
