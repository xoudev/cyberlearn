import { banState, banTimeLeft, type BanState } from "@cyberlearn/lib";
import type { Tone } from "../_components/admin-ui";
import { STATUS_META } from "./ticket-meta";

/** How the console names each state of a contested ban, and its colour. */
export const BAN_STATE_META: Record<BanState, { label: string; tone: Tone }> = {
  ACTIVE: { label: "En cours", tone: "danger" },
  LIFTED: { label: "Levé", tone: "accent" },
  EXPIRED: { label: "Expiré", tone: "neutral" },
};

/** The ban a ticket contests, as ticketRepository.findWithThread reads it. */
export interface AppealedBan {
  userId: string;
  reason: string;
  expiresAt: Date | null;
  createdAt: Date;
  liftedAt: Date | null;
  liftReason: string | null;
  issuedBy: { displayName: string } | null;
  liftedBy: { displayName: string } | null;
}

/** The card's content, every date already in words. */
export interface AppealedBanView {
  state: BanState;
  stateLabel: string;
  tone: Tone;
  userId: string;
  reason: string;
  /** When it was decided, and by whom when that account still exists. */
  issued: string;
  /** How long it runs, ran or was meant to run, depending on the state. */
  duration: string;
  /** Set once somebody lifted it. */
  lifted: { on: string; reason: string | null } | null;
}

/**
 * What the « Bannissement contesté » card says about a ban, whatever became of
 * it since the appeal was filed.
 *
 * The duration line answers a different question in each state. In force:
 * how long is left, in the words the person read on their own screen
 * (banTimeLeft). Run its course: when it ended. Lifted: what had been decided,
 * since the lift is the end that counts and has its own line.
 *
 * `stamp` formats a date: the page owns the locale and the time zone.
 */
export function describeAppealedBan(
  ban: AppealedBan,
  now: Date,
  stamp: (date: Date) => string,
): AppealedBanView {
  const state = banState(ban, now);
  const meta = BAN_STATE_META[state];
  const by = (person: { displayName: string } | null): string =>
    person !== null && person.displayName.trim() !== "" ? ` · ${person.displayName}` : "";

  let duration: string;
  if (state === "ACTIVE") {
    duration = banTimeLeft(ban.expiresAt, now);
  } else if (state === "EXPIRED") {
    // Only a ban with an end date runs out, so expiresAt is set here; the
    // fallback is banTimeLeft's own word for it rather than a cast.
    duration =
      ban.expiresAt !== null
        ? `Terminé le ${stamp(ban.expiresAt)}`
        : banTimeLeft(ban.expiresAt, now);
  } else {
    duration =
      ban.expiresAt === null ? "Prévu définitif" : `Prévu jusqu'au ${stamp(ban.expiresAt)}`;
  }

  return {
    state,
    stateLabel: meta.label,
    tone: meta.tone,
    userId: ban.userId,
    reason: ban.reason,
    issued: `${stamp(ban.createdAt)}${by(ban.issuedBy)}`,
    duration,
    lifted:
      ban.liftedAt !== null
        ? {
            on: `${stamp(ban.liftedAt)}${by(ban.liftedBy)}`,
            reason: ban.liftReason !== null && ban.liftReason.trim() !== "" ? ban.liftReason : null,
          }
        : null,
  };
}

/** What an account's page says about the appeal filed against its ban in force. */
export interface BanAppealView {
  /** Already in French, and ending on what the link does. */
  label: string;
  tone: Tone;
}

/**
 * The appeal of a ban, from where its ticket stands.
 *
 * The link from the ban to its ticket is written once and never undone: an
 * appeal refused is answered and its ticket closed, and the ban stays in force
 * with the same link. A tag that said "ouvert" for as long as the link existed
 * told whoever opened the account later that a request was waiting on an
 * answer when the conversation was over.
 *
 * `ticket` is null when the account's tickets do not hold it, which says only
 * that an appeal was filed.
 */
export function describeBanAppeal(ticket: { status: string; open: boolean } | null): BanAppealView {
  if (ticket === null) return { label: "Un appel a été déposé · lire", tone: "neutral" };
  if (ticket.open) return { label: "Un appel est ouvert · lire", tone: "warning" };
  const status = (STATUS_META[ticket.status]?.label ?? ticket.status).toLowerCase();
  return { label: `Appel traité (${status}) · lire`, tone: "neutral" };
}
