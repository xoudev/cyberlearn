/**
 * One difference a sync from the repository would write, worded for the
 * console's "Synchroniser avec le dépôt" page, which lists them before it
 * writes anything: the database is what the site reads, and nothing in it is
 * replaced unseen.
 *
 * - changed: a value replaced by another;
 * - added: something the database does not have yet;
 * - removed: something the sync takes out (or switches off);
 * - modified: something rewritten in place, too long to quote, said in words.
 */
export type CatalogueChange =
  | { kind: "changed"; label: string; before: string; after: string }
  | { kind: "added"; label: string; value: string }
  | { kind: "removed"; label: string; value: string }
  | { kind: "modified"; label: string; value: string };

/** A changed value, or nothing when both sides read the same. */
export function changedValue(
  label: string,
  before: string | number | null,
  after: string | number | null,
): CatalogueChange[] {
  const b = before === null ? "aucun" : String(before);
  const a = after === null ? "aucun" : String(after);
  return b === a ? [] : [{ kind: "changed", label, before: b, after: a }];
}
