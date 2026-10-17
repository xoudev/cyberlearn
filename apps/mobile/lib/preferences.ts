/**
 * The settings after one optimistic change whose write did not go through:
 * that setting goes back to the value it held before the change, and every
 * other one stays as the cache holds it now (one changed meanwhile has its own
 * write, and its own outcome).
 *
 * The value comes from before the change, not from a refetch: a write that
 * failed for want of a network takes the refetch down with it, and the screen
 * then showed the defaults (« Anonyme », profil public), a privacy setting
 * the reader never chose.
 */
export function undoSettingChange<T extends object, K extends keyof T>(
  current: T,
  before: T,
  key: K,
): T {
  return { ...current, [key]: before[key] };
}
