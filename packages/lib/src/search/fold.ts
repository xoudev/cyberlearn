/**
 * Accent folding, shared by the two places that have to agree about it.
 *
 * The site is in French. Someone typing "securite" means "sécurité", and a
 * search that makes them find the accent key is not a search. Postgres' ILIKE
 * folds case but not accents, and unaccent() is an extension this database does
 * not have, so the database does it with translate() and a character table -
 * the table below. The browser side folds the same term in JavaScript to score
 * the results it gets back.
 *
 * Two implementations of one rule is how they drift, so the table lives here,
 * the SQL reads it from here, and fold-agreement is asserted in the tests: for
 * every character in the table, foldChar and foldText must say the same thing.
 */

/**
 * The accented half of the fold. Paired index by index with FOLD_PLAIN, which
 * is what Postgres' translate() requires; lower() runs first, so only the
 * lowercase forms are listed.
 */
export const FOLD_ACCENTED = "àáâãäåçèéêëìíîïñòóôõöùúûüýÿ";

/** The plain half. Same length as FOLD_ACCENTED, character for character. */
export const FOLD_PLAIN = "aaaaaaceeeeiiiinooooouuuuyy";

/**
 * A string as the search compares it: lowercase, and with accents removed.
 *
 * NFD splits an accented character into its letter and its combining mark; the
 * marks are then dropped. This covers more than the table above - which is
 * fine, the table is the floor, not the ceiling - and the tests hold it to
 * agreeing with the table on every character in it.
 */
export function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
