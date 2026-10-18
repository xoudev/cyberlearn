/**
 * What the keep-alive job (app/api/cron/keep-alive) reports of the two
 * services it wakes, and how a run that found one asleep is recorded for the
 * console's crons page.
 */

/** "unknown" is Redis left unconfigured, which is not a failure. */
export type PingStatus = "ok" | "error" | "unknown";

export interface PingResults {
  postgres: PingStatus;
  redis: PingStatus;
}

/** Why the run failed, in the console's words, or null when every configured service answered. */
export function keepAliveFailure(results: PingResults): string | null {
  const down = [
    results.postgres === "error" ? "Postgres" : null,
    results.redis === "error" ? "Redis" : null,
  ].filter((name) => name !== null);
  if (down.length === 0) return null;
  return `${down.join(" et ")} ${down.length > 1 ? "ne répondent pas" : "ne répond pas"}`;
}
