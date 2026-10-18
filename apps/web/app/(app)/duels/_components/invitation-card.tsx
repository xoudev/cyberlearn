import React from "react";
import { initialsOf } from "@/lib/avatar/glyphs";
import type { DuelSummary } from "@/lib/social/duels";
import { plural, whenOf } from "./duel-words";
import { RespondButtons } from "./respond-buttons";
import "./duels.css";

/**
 * An invitation, as the duel it would start: the friend's monogram, who
 * challenges the reader on which path, when the offer lapses, and the answer.
 * Drawn on the duels' list and on the dashboard, the same card.
 */
export function InvitationCard({ duel }: { duel: DuelSummary }): React.ReactElement {
  return (
    <li className="dl-invites__item">
      <article className="dl-invite">
        <p className="dl-invite__eyebrow">Défi reçu</p>
        <span className="dl-mono dl-mono--lg" aria-hidden="true">
          {initialsOf(duel.other.name)}
        </span>
        <div>
          <p className="dl-invite__text">
            <strong>{duel.other.name}</strong> te défie sur «&nbsp;{duel.pathTitle}&nbsp;»
          </p>
          <p className="dl-invite__meta">
            {duel.questionCount} {plural(duel.questionCount, "question")} · expire{" "}
            <time dateTime={duel.expiresAt}>{whenOf(duel.expiresAt)}</time>
          </p>
        </div>
        <div className="dl-invite__actions">
          <RespondButtons duelId={duel.id} />
        </div>
      </article>
    </li>
  );
}
