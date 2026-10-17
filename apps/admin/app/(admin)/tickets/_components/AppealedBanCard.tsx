"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { keepFormInput } from "@/lib/form-input";
import { liftAppealedBanAction, type LiftAppealState } from "../../_actions/ticket-actions";
import { Card, Tag } from "../../_components/admin-ui";
import { TICKET_CARDS } from "./ticket-columns";
import { LiftReasonField } from "../../_components/lift-reason-field";
import type { AppealedBanView } from "../appealed-ban";

/**
 * The ban an appeal contests, on the appeal's own ticket, and the control that
 * accepts it.
 *
 * Reading an appeal used to mean opening the account in another tab to find
 * out what was being contested, then lifting from there with nothing to say
 * which appeal it answered. The ban is here now, whatever became of it, and
 * « Lever » lifts that ban and no other: one lifted, run out or replaced since
 * is refused by the action, not by this card.
 *
 * A client component for one reason: the outcome of a lift has to outlive the
 * form. A lift that worked re-renders the card as "Levé" without its form, and
 * a warning written under that form - the reply did not go, the ticket could
 * not be resolved - would leave with it, as ban-form.tsx found out.
 */
export function AppealedBanCard({
  ticketId,
  ticketOpen,
  ban,
}: {
  ticketId: string;
  /** Whether the ticket still takes a reply: decided by the server from its status. */
  ticketOpen: boolean;
  /** Every date already formatted by the server, which owns the locale. */
  ban: AppealedBanView;
}): React.ReactElement {
  const [state, action, pending] = useActionState<LiftAppealState, FormData>(
    liftAppealedBanAction,
    {},
  );

  return (
    <Card title={TICKET_CARDS.appealedBan} action={<Tag tone={ban.tone}>{ban.stateLabel}</Tag>}>
      <div className="a-defrow">
        <span className="a-defrow-label">Compte</span>
        <Link href={`/users/${ban.userId}`} style={{ color: "var(--a-accent)", fontSize: 12.5 }}>
          Voir la fiche du compte →
        </Link>
      </div>
      <div className="a-defrow">
        <span className="a-defrow-label">Décidé le</span>
        <span className="mono a-field-hint">{ban.issued}</span>
      </div>
      <div className="a-defrow">
        <span className="a-defrow-label">Durée</span>
        <span className="mono a-field-hint">{ban.duration}</span>
      </div>
      {ban.lifted !== null && (
        <>
          <div className="a-defrow">
            <span className="a-defrow-label">Levé le</span>
            <span className="mono a-field-hint">{ban.lifted.on}</span>
          </div>
          {ban.lifted.reason !== null && (
            <div className="a-defrow">
              <span className="a-defrow-label">Motif de la levée</span>
              <span className="mono a-field-hint" style={{ textAlign: "right" }}>
                {ban.lifted.reason}
              </span>
            </div>
          )}
        </>
      )}

      <div className="a-card-pad" style={{ display: "grid", gap: 14 }}>
        <p className="a-form-notice" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {ban.reason}
        </p>

        {/* Above the form, not inside it: see the note on the component. */}
        {state.ok === true &&
          (state.warning !== undefined ? (
            <p className="a-form-error" role="alert">
              {state.warning}
            </p>
          ) : (
            <p className="a-form-notice" role="status">
              {state.resolved === true
                ? "Bannissement levé, et le ticket passé en résolu."
                : "Bannissement levé."}
            </p>
          ))}

        {ban.state === "ACTIVE" ? (
          <form action={action} onReset={keepFormInput} className="a-form">
            <input type="hidden" name="ticketId" value={ticketId} />
            <LiftReasonField />
            {ticketOpen && (
              <label className="a-field">
                <span className="a-label">
                  Réponse au demandeur<span className="a-label-optional"> · optionnelle</span>
                </span>
                <textarea
                  name="reply"
                  maxLength={5000}
                  rows={4}
                  className="a-textarea"
                  placeholder="Après relecture, ton bannissement est levé."
                />
                <span className="a-field-hint">
                  Part par e-mail et s&apos;affiche sur sa page, comme une réponse du fil.
                </span>
              </label>
            )}
            <button type="submit" disabled={pending} className="a-btn a-btn--ghost">
              {pending ? "Levée…" : "Lever"}
            </button>
            <span className="a-field-hint">
              {ticketOpen
                ? "Lève ce bannissement-là, pas un autre, puis passe le ticket en résolu."
                : "Lève ce bannissement-là, pas un autre. Le ticket, déjà terminé, reste tel quel."}
            </span>
            {state.error !== undefined && (
              <p className="a-form-error" role="alert">
                {state.error}
              </p>
            )}
          </form>
        ) : (
          state.ok !== true && (
            <span className="a-field-hint">
              {ban.state === "LIFTED"
                ? "Ce bannissement a déjà été levé : il n'y a plus rien à lever."
                : "Ce bannissement a pris fin de lui-même : il n'y a plus rien à lever."}
            </span>
          )
        )}
      </div>
    </Card>
  );
}
