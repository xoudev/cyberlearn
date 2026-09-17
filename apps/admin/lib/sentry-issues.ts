import { env } from "@/lib/env";

/**
 * The unresolved Sentry issues, for the console's dashboard.
 *
 * It was worth asking whether this was feasible at all. It is: the three values
 * it needs - org, project and an auth token - are already in this app's env
 * schema, because the build uploads source maps with them. What it may need is
 * a wider scope on that token: uploading source maps wants project:releases,
 * reading issues wants project:read or event:read. The failure is reported
 * rather than swallowed, so a token missing the scope says so instead of
 * rendering an empty list that reads as "no errors".
 *
 * Read-only, server-side, and never fatal. The console has work to do that has
 * nothing to do with Sentry, and an error monitor that can take the dashboard
 * down is worse than no error monitor.
 */

export interface SentryIssue {
  id: string;
  title: string;
  /** Where it happened: the function or route Sentry attributes it to. */
  culprit: string;
  level: string;
  count: number;
  userCount: number;
  lastSeen: string;
  permalink: string;
}

export type SentryIssuesResult =
  | { state: "ok"; issues: SentryIssue[] }
  | { state: "unconfigured" }
  | { state: "error"; reason: string };

interface RawIssue {
  id?: unknown;
  title?: unknown;
  culprit?: unknown;
  level?: unknown;
  count?: unknown;
  userCount?: unknown;
  lastSeen?: unknown;
  permalink?: unknown;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** Sentry returns count as a string; userCount as a number. Both may be absent. */
function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function fetchSentryIssues(limit = 8): Promise<SentryIssuesResult> {
  const { SENTRY_ORG: org, SENTRY_PROJECT: project, SENTRY_AUTH_TOKEN: token } = env;
  if (!org || !project || !token) return { state: "unconfigured" };

  const url =
    `https://sentry.io/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/issues/` +
    `?query=${encodeURIComponent("is:unresolved")}&statsPeriod=24h&limit=${String(limit)}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      // Sentry is a third party on the critical path of a page render. A minute
      // of staleness is nothing next to a dashboard that hangs on their outage.
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 401 || response.status === 403) {
      return {
        state: "error",
        reason:
          "Le jeton Sentry n'a pas la portée pour lire les issues (project:read ou event:read).",
      };
    }
    if (!response.ok) {
      return { state: "error", reason: `Sentry a répondu ${String(response.status)}.` };
    }

    const body: unknown = await response.json();
    if (!Array.isArray(body)) return { state: "error", reason: "Réponse Sentry inattendue." };

    const issues = (body as RawIssue[]).map((raw) => ({
      id: str(raw.id),
      title: str(raw.title, "(sans titre)"),
      culprit: str(raw.culprit),
      level: str(raw.level, "error"),
      count: num(raw.count),
      userCount: num(raw.userCount),
      lastSeen: str(raw.lastSeen),
      permalink: str(raw.permalink),
    }));
    return { state: "ok", issues };
  } catch (error) {
    // A timeout lands here too, which is the case this exists for.
    console.error("[sentry] issues fetch failed:", error);
    return { state: "error", reason: "Sentry est injoignable." };
  }
}
