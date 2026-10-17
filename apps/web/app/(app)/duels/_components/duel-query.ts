/**
 * The parameter that opens the "Défier" window over the page: `?duel=1`, or
 * `?duel=<friend id>` with that friend already picked (registered in
 * components/query-dialogs.ts). The old `/duels?ami=<id>` lands on it.
 */
export const DUEL_QUERY = "duel";

/** The value that opens the window with nobody asked for. */
export const ANY_FRIEND = "1";

/** The friend the window was opened for, or null when it was opened for anybody. */
export function wantedFriend(value: string): string | null {
  return value === ANY_FRIEND || value === "" ? null : value;
}
