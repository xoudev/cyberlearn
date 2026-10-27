import type React from "react";
import { surfaceNoun } from "@cyberlearn/lib/moderation/notice";
import {
  MODERATION_RECORD_EMPTY,
  MODERATION_RECORD_INTRO,
  moderationOutcome,
} from "@cyberlearn/lib/moderation/record";
import type { ModerationSectionData } from "../../_lib/settings-data";
import { SectionHead } from "../../_components/SettingsPrimitives";
import { S, SANS } from "../../_components/tokens";

/**
 * Somebody's own moderation record.
 *
 * What they get to see about themselves: when, what was flagged, and how it
 * ended. Not the score and not the rules that fired - the first means nothing
 * outside the analyser and the second turns the filter into a puzzle people
 * retry until they beat it.
 *
 * It exists because the notices point somewhere. "Ta réponse a été supprimée"
 * in an inbox three days later, with no way to see which one or what has
 * happened since, is an accusation rather than an explanation.
 *
 * The words are the app's too (@cyberlearn/lib/moderation/record).
 */

function stamp(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

/** The moderation record, in the settings drawer. */
export function ModerationSection({ data }: { data: ModerationSectionData }): React.JSX.Element {
  const { events } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="MODÉRATION" hint="ce qui a été signalé" />

      <p style={{ fontFamily: SANS, fontSize: 14, lineHeight: 1.65, color: S.fg2, margin: 0 }}>
        {MODERATION_RECORD_INTRO}
      </p>

      {events.length === 0 ? (
        <p
          style={{
            fontFamily: SANS,
            fontSize: 14,
            lineHeight: 1.6,
            color: S.fg2,
            background: "#121418",
            border: `1px solid ${S.borderSoft}`,
            borderLeft: "4px solid var(--color-success)",
            padding: "20px 22px",
            margin: 0,
          }}
        >
          {MODERATION_RECORD_EMPTY}
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
          {events.map((event) => {
            const state = moderationOutcome(event.outcome);
            return (
              <li
                key={event.id}
                style={{
                  border: `1px solid ${S.borderSoft}`,
                  borderLeft: `4px solid ${state.color}`,
                  background: "#121418",
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "4px 14px",
                    justifyContent: "space-between",
                    fontFamily: SANS,
                    fontSize: 12,
                    color: S.muted,
                    marginBottom: 10,
                  }}
                >
                  <span style={{ color: S.fg }}>{surfaceNoun(event.surface)}</span>
                  <span>{stamp(new Date(event.createdAt))}</span>
                </div>

                <p
                  style={{
                    fontFamily: SANS,
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: S.fg2,
                    margin: "0 0 12px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {event.excerpt}
                </p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "4px 14px",
                    fontFamily: SANS,
                    fontSize: 13,
                    fontWeight: 700,
                    color: state.color,
                  }}
                >
                  <span>{state.label}</span>
                  {event.reviewedAt !== null && (
                    <span style={{ color: S.muted }}>le {stamp(new Date(event.reviewedAt))}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
