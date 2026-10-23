/**
 * The first of these that is a string with something in it, or "". A build
 * variable set to nothing (an unfilled `.env.local` line, `supabaseUrl: ""` in
 * the app config) counts as unset, so the next candidate gets its turn.
 *
 * Takes `unknown` because `process.env` is typed `any` by the Metro typings
 * Expo ships: reading it through here keeps the `any` from spreading into the
 * URLs and clients built from it.
 */
export function firstNonEmpty(...candidates: readonly unknown[]): string {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate !== "") return candidate;
  }
  return "";
}
