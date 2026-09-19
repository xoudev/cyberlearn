import { env } from "@/lib/env";

/**
 * The unresolved Sentry issues, for the console's dashboard.
 *
 * Reading issues and uploading source maps are two different permissions, and
 * that is the whole difficulty. The build uploads source maps with an
 * organisation token, whose set of scopes is fixed and cannot be widened -
 * reading issues is not in it. So the token that got us this far is, by
 * construction, the wrong one for this, and no amount of editing it in Sentry
 * will help.
 *
 * SENTRY_ISSUES_TOKEN exists for that: a user token carrying event:read, kept
 * apart from the build's. It falls back to SENTRY_AUTH_TOKEN, which is right
 * whenever the one token happens to have both.
 *
 * The scope is event:read specifically. project:read alone is refused, which
 * is worth stating because granting it and watching this keep failing is a
 * long way to go for nothing.
 *
 * A failure is reported rather than swallowed: a token that cannot read says
 * so, instead of rendering an empty list that reads as "no errors".
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

/** What Sentry says about a refusal, when it bothers to say something. */
function detailOf(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("detail" in body)) return null;
  const detail = (body as { detail: unknown }).detail;
  return typeof detail === "string" && detail.trim() !== "" ? detail : null;
}

export async function fetchSentryIssues(limit = 8): Promise<SentryIssuesResult> {
  const { SENTRY_ORG: org, SENTRY_PROJECT: project } = env;
  // The build's token is the fallback, not the intended one. See the note above.
  const token = env.SENTRY_ISSUES_TOKEN ?? env.SENTRY_AUTH_TOKEN;
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

    // 401 and 403 are two different problems and used to share one message:
    // one is "this token is not accepted", the other "it is, and it may not do
    // that". Told the same thing, somebody widens a scope on a token that was
    // never the issue.
    if (response.status === 401 || response.status === 403) {
      const detail = detailOf(await response.json().catch(() => null));
      const said = detail === null ? "" : ` Sentry dit : « ${detail} »`;
      return {
        state: "error",
        reason:
          response.status === 401
            ? `Sentry n'accepte pas ce jeton (401). Renseigne SENTRY_ISSUES_TOKEN avec un jeton utilisateur.${said}`
            : `Le jeton Sentry n'a pas la portée event:read. Un jeton d'organisation, celui qui téléverse les source maps, ne peut pas l'obtenir : sa portée est figée. Crée un jeton utilisateur et renseigne SENTRY_ISSUES_TOKEN.${said}`,
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
