import React from "react";
import { UI } from "./admin-ui";
import type { SentryIssuesResult } from "@/lib/sentry-issues";

/**
 * Unresolved Sentry issues, on the console's dashboard.
 *
 * Three states, all of them said out loud. An empty list means twenty-four
 * hours without an unresolved error, which is news worth printing; a missing
 * configuration and a refused token are different news, and showing either as
 * an empty list would be the dashboard quietly claiming everything is fine.
 */

const LEVEL_COLOR: Record<string, string> = {
  fatal: UI.danger,
  error: UI.danger,
  warning: UI.warning,
  info: UI.blueSoft,
  debug: UI.muted,
};

function relative(iso: string): string {
  if (iso === "") return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${String(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${String(hours)} h`;
  return `il y a ${String(Math.floor(hours / 24))} j`;
}

function Note({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p
      style={{
        margin: 0,
        padding: "34px 18px",
        textAlign: "center",
        fontFamily: UI.mono,
        fontSize: 11.5,
        lineHeight: 1.7,
        color: UI.muted,
      }}
    >
      {children}
    </p>
  );
}

export function SentryCard({ result }: { result: SentryIssuesResult }): React.JSX.Element {
  if (result.state === "unconfigured") {
    return (
      <Note>
        Sentry n&apos;est pas configuré pour cette console.
        <br />
        Renseigne <b style={{ color: UI.fg2 }}>SENTRY_ORG</b>,{" "}
        <b style={{ color: UI.fg2 }}>SENTRY_PROJECT</b> et{" "}
        <b style={{ color: UI.fg2 }}>SENTRY_AUTH_TOKEN</b>.
      </Note>
    );
  }

  if (result.state === "error") {
    return (
      <Note>
        <span style={{ color: UI.warning }}>{result.reason}</span>
        <br />
        Les erreurs continuent d&apos;être remontées à Sentry ; c&apos;est leur affichage ici qui
        manque.
      </Note>
    );
  }

  if (result.issues.length === 0) {
    return (
      <Note>
        <span style={{ color: UI.turquoise }}>Aucune erreur non résolue sur 24 h.</span>
      </Note>
    );
  }

  return (
    <div className="a-feed">
      {result.issues.map((issue) => (
        <a
          key={issue.id}
          href={issue.permalink}
          target="_blank"
          rel="noreferrer noopener"
          className="a-feed-item"
          style={{
            textDecoration: "none",
            borderLeft: `2px solid ${LEVEL_COLOR[issue.level] ?? UI.muted}`,
            paddingLeft: 12,
          }}
        >
          <div className="a-feed-body">
            <b style={{ color: UI.fg }}>{issue.title}</b>
            <div className="a-feed-meta">
              {issue.culprit !== "" ? (
                <span style={{ fontFamily: UI.mono, fontSize: 11 }}>{issue.culprit}</span>
              ) : null}
              {/* Events and people affected, in that order: a thousand events
                  from one person is a loop, a hundred from a hundred people is
                  an outage, and the pair is what tells them apart. */}
              <span style={{ marginLeft: issue.culprit !== "" ? 8 : 0, color: UI.muted }}>
                {issue.count} évén. · {issue.userCount} pers.
              </span>
            </div>
          </div>
          <span className="a-feed-time">{relative(issue.lastSeen)}</span>
        </a>
      ))}
    </div>
  );
}
