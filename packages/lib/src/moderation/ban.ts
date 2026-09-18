/**
 * What a ban is, in the abstract: whether it applies, for how much longer, and
 * how to say so in French.
 *
 * No database and no React, because "is this account banned right now" is a
 * question with edge cases - an expiry in the past, one exactly now, a lifted
 * ban that has not expired, a permanent one - and each of them is a way for
 * somebody to be locked out by accident or to walk back in early.
 */

/** The shape the answer depends on. Anything with these fields can be asked. */
export interface BanLike {
  /** Null means permanent. */
  expiresAt: Date | null;
  /** Set when an administrator lifted it early. */
  liftedAt: Date | null;
}

/**
 * Whether a ban is in force at `now`.
 *
 * Lifted always wins: an administrator who lifted a ban an hour ago has decided,
 * and an expiry date still in the future does not overrule them.
 *
 * The comparison is strict, so a ban expiring at exactly `now` is over. The
 * alternative keeps somebody out for one more millisecond and reads as a bug
 * at the only moment anybody is watching the clock: the moment it ends.
 */
export function isBanActive(ban: BanLike, now: Date = new Date()): boolean {
  if (ban.liftedAt !== null) return false;
  if (ban.expiresAt === null) return true;
  return ban.expiresAt.getTime() > now.getTime();
}

/** The lengths the console offers. Permanent is the absence of one. */
export const BAN_DURATIONS = [
  { key: "24h", label: "24 heures", hours: 24 },
  { key: "7d", label: "7 jours", hours: 24 * 7 },
  { key: "30d", label: "30 jours", hours: 24 * 30 },
  { key: "permanent", label: "Définitif", hours: null },
] as const;

export type BanDurationKey = (typeof BAN_DURATIONS)[number]["key"];

/** Whether a string is one of the lengths on offer, for validating a form. */
export function isBanDurationKey(value: string): value is BanDurationKey {
  return BAN_DURATIONS.some((duration) => duration.key === value);
}

/**
 * When a ban chosen now would end, or null for a permanent one.
 *
 * Takes `from` so the caller decides what "now" is - which is what makes this
 * testable at all.
 */
export function banExpiryFor(key: BanDurationKey, from: Date = new Date()): Date | null {
  const duration = BAN_DURATIONS.find((d) => d.key === key);
  if (duration?.hours == null) return null;
  return new Date(from.getTime() + duration.hours * 3_600_000);
}

/**
 * How long is left, in words somebody reads once and understands.
 *
 * Rounds up, deliberately. "Il reste 0 heure" on a ban with fifty minutes to go
 * is wrong in the direction that makes people write in.
 */
export function banTimeLeft(expiresAt: Date | null, now: Date = new Date()): string {
  if (expiresAt === null) return "Ce bannissement est définitif.";

  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return "Ce bannissement est terminé.";

  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) {
    return `Il reste ${String(minutes)} minute${minutes > 1 ? "s" : ""}.`;
  }
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) {
    return `Il reste ${String(hours)} heure${hours > 1 ? "s" : ""}.`;
  }
  const days = Math.ceil(hours / 24);
  return `Il reste ${String(days)} jours.`;
}
