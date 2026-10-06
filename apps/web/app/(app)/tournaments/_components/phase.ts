import type { TournamentPhase } from "@cyberlearn/lib/challenges/tournament";

/** The colour a tournament's phase is drawn in, on the list and on its page. */
export const PHASE_COLOR: Record<TournamentPhase, string> = {
  RUNNING: "var(--cosmetic-accent)",
  UPCOMING: "var(--color-info)",
  FINISHED: "var(--color-text-muted)",
};
