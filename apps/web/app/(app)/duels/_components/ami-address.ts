import { z } from "zod";
import { ANY_FRIEND, DUEL_QUERY } from "./duel-query";

const friendId = z.guid();

/**
 * Where the old `/duels?ami=<id>` goes now: /duels with the "Défier" window
 * open (?duel=), the friend picked when the value is an id. Anything else in
 * it opens the window with nobody picked rather than carrying it along.
 */
export function duelsAddressFor(ami: string | string[]): string {
  const raw = Array.isArray(ami) ? ami[0] : ami;
  const parsed = friendId.safeParse(raw?.trim());
  const value = parsed.success ? parsed.data : ANY_FRIEND;
  return `/duels?${new URLSearchParams({ [DUEL_QUERY]: value }).toString()}`;
}
