import { banTimeLeft, isBanActive } from "@cyberlearn/lib/moderation/ban";
import { appealView, type AppealView } from "@cyberlearn/lib/tickets/appeal";
import { dbTime } from "./db-time";

/**
 * The ban on this account, as the app reads it: its own rows of `user_bans`,
 * which RLS lets a person read (user_bans_select_own), and the site's rule for
 * which one is in force (`isBanActive`). The server refuses a banned account
 * on its own; this is only so the app says why, instead of failing everywhere.
 */

export const BAN_COLUMNS = "id,reason,expiresAt,createdAt,liftedAt,acknowledgedAt,appealTicketId";

export interface RawBanRow {
  id: string;
  reason: string;
  expiresAt: string | null;
  createdAt: string;
  liftedAt: string | null;
  acknowledgedAt: string | null;
  appealTicketId: string | null;
}

export interface ActiveBan {
  id: string;
  reason: string;
  /** Null is permanent. */
  expiresAt: Date | null;
  createdAt: Date;
  acknowledged: boolean;
  appealed: boolean;
}

/** The ban in force at `now`, the newest if there were ever two, or null. */
export function activeBanOf(rows: readonly RawBanRow[], now: Date): ActiveBan | null {
  const active = rows
    .map((row) => ({
      row,
      expiresAt: row.expiresAt === null ? null : dbTime(row.expiresAt),
      liftedAt: row.liftedAt === null ? null : dbTime(row.liftedAt),
      createdAt: dbTime(row.createdAt),
    }))
    .filter((ban) => isBanActive(ban, now))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (!active) return null;
  return {
    id: active.row.id,
    reason: active.row.reason,
    expiresAt: active.expiresAt,
    createdAt: active.createdAt,
    acknowledged: active.row.acknowledgedAt !== null,
    appealed: active.row.appealTicketId !== null,
  };
}

/** "Ce bannissement est définitif." or "Il reste 3 jours.", the site's words. */
export function banDurationLabel(ban: ActiveBan, now: Date): string {
  return banTimeLeft(ban.expiresAt, now);
}

const APPEAL_MIN_LENGTH = 30;
export const APPEAL_MAX_LENGTH = 4000;

/**
 * What is wrong with an appeal before it is sent, in the server's words, or
 * null. The server checks again; this only saves a round trip for a message
 * that was always going to be refused.
 */
export function appealProblem(message: string): string | null {
  const length = message.trim().length;
  if (length < APPEAL_MIN_LENGTH) return "Explique en quelques phrases : au moins 30 caractères.";
  if (length > APPEAL_MAX_LENGTH) return "4000 caractères maximum.";
  return null;
}

/** What the banned screen shows about the appeal. */
export type AppealPanel =
  | { kind: "view"; view: AppealView }
  /** The standing is not known: said as such, never as "transmis". */
  | { kind: "unknown"; title: string; text: string; canRetry: boolean };

/**
 * The appeal panel, from what the app has read of it.
 *
 * Only the server knows whether the team has answered. An appeal that was
 * examined and refused used to read "Appel transmis" in green for as long as
 * the read was loading, or after it failed (offline, a 5xx): the original
 * defect, back through the side door. So the panel assumes "received" in one
 * case only, an appeal sent a moment ago from this very screen, which nobody
 * can have answered yet; in every other case an unread standing is said to be
 * unread.
 */
export function appealPanelOf(input: {
  /** undefined while loading, null when the server holds no appeal. */
  standing: AppealView | null | undefined;
  /** The read failed, and there is no earlier one to fall back on. */
  failed: boolean;
  /** Sent from this screen, in this session. */
  sentHere: boolean;
}): AppealPanel {
  if (input.standing != null) return { kind: "view", view: input.standing };
  if (input.sentHere) return { kind: "view", view: appealView({ status: "OPEN", reply: null }) };
  if (input.standing === undefined && !input.failed) {
    return {
      kind: "unknown",
      title: "Ton appel",
      text: "Chargement de l'état de ton appel…",
      canRetry: false,
    };
  }
  return {
    kind: "unknown",
    title: "Ton appel",
    text: "L'état de ton appel n'a pas pu être chargé. Vérifie ta connexion, puis réessaie.",
    canRetry: true,
  };
}
