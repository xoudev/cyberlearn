/**
 * Whether an administrator's TOTP factors are still the ones the console
 * pinned (apps/admin/lib/auth.ts, admin_mfa_pins).
 *
 * The first time the console sees an administrator with verified factors, it
 * pins them. After that, the set must stay the same: a factor removed, or one
 * added, means the second factor was changed outside the console (Supabase
 * lets any aal2 session do either), and the console closes until the recovery
 * procedure clears the pins and the next enrolment is pinned in turn.
 */
export type MfaPinVerdict =
  /** Nothing was pinned yet: the factors seen now are pinned. */
  | "pin"
  /** The same factors as pinned. */
  | "match"
  /** A pinned factor is gone, or a factor was added: the console stays shut. */
  | "changed";

export function mfaPinVerdict(
  pinned: readonly string[],
  verified: readonly string[],
): MfaPinVerdict {
  if (pinned.length === 0) return "pin";
  const current = new Set(verified);
  if (current.size !== new Set(pinned).size) return "changed";
  return pinned.every((id) => current.has(id)) ? "match" : "changed";
}
