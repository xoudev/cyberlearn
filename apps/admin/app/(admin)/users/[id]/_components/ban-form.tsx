"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { BAN_DURATIONS } from "@cyberlearn/lib";
import { Select } from "@cyberlearn/ui";
import { keepFormInput } from "@/lib/form-input";
import { banUserAction, liftBanAction, type BanUserState } from "../../../_actions/user-actions";
import { Card, Tag } from "../../../_components/admin-ui";

/**
 * Banning somebody, and letting them back in.
 *
 * The motive is required and the field says so, because it is not paperwork:
 * it is what the person reads in their inbox and what whoever picks up the
 * appeal has to judge. A ban with a blank reason cannot be contested - there is
 * nothing to answer - so the form does not accept one.
 *
 * When a ban is already in force the form is replaced by what it says and a
 * single button to lift it. Two bans on one account would mean two reasons and
 * two end dates, and lifting one of them would look like it had done nothing.
 */
export function BanForm({
  userId,
  active,
  history,
}: {
  userId: string;
  active: {
    reason: string;
    /** Already in French. */
    endsLabel: string;
    issuedOn: string;
    issuedBy: string | null;
    /** The ticket contesting this ban, when one was opened. */
    appealTicketId: string | null;
  } | null;
  history: { id: string; reason: string; issuedOn: string; outcome: string }[];
}): React.ReactElement {
  const [banState, banAction, banPending] = useActionState<BanUserState, FormData>(
    banUserAction,
    {},
  );
  const [liftState, liftAction, liftPending] = useActionState<BanUserState, FormData>(
    liftBanAction,
    {},
  );

  return (
    <Card title={active ? "Bannissement en cours" : "Bannissement"} pad>
      {/* Above both branches, not inside the form that sent it: a ban that
          went through re-renders this card as "Bannissement en cours", and the
          warning used to leave with the form it was written under. It goes
          once the ban does. */}
      {active !== null && banState.ok === true && banState.emailFailed === true && (
        <p className="a-form-error" style={{ marginBottom: 14 }}>
          Le compte est banni, mais l&apos;e-mail d&apos;information n&apos;a pas pu être envoyé :
          la personne ne sait ni qu&apos;elle est bannie ni pourquoi. Préviens-la par un autre
          moyen.
        </p>
      )}

      {active ? (
        <>
          <div className="a-defrow">
            <span className="a-defrow-label">Décidé le</span>
            <span className="mono a-field-hint">
              {active.issuedOn}
              {active.issuedBy !== null ? ` · ${active.issuedBy}` : ""}
            </span>
          </div>
          <div className="a-defrow">
            <span className="a-defrow-label">Durée</span>
            <span className="mono a-field-hint">{active.endsLabel}</span>
          </div>
          <div className="a-defrow">
            <span className="a-defrow-label">Appel</span>
            {active.appealTicketId !== null ? (
              // The appeal is read and answered on its ticket: one click there,
              // and the ticket links back here to lift the ban.
              <Link href={`/tickets/${active.appealTicketId}`} className="a-row-link">
                <Tag tone="warning">Un appel est ouvert · lire</Tag>
              </Link>
            ) : (
              <span className="mono a-field-hint">Aucun</span>
            )}
          </div>

          <p className="a-form-notice" style={{ marginTop: 14, whiteSpace: "pre-wrap" }}>
            {active.reason}
          </p>

          <form
            action={liftAction}
            onReset={keepFormInput}
            className="a-form"
            style={{ marginTop: 16 }}
          >
            <input type="hidden" name="userId" value={userId} />
            <label className="a-field">
              <span className="a-label">
                Motif de la levée<span className="a-label-optional"> · optionnel</span>
              </span>
              <input
                name="reason"
                maxLength={500}
                className="a-input"
                placeholder="Appel accepté : faux positif"
              />
            </label>
            <button type="submit" disabled={liftPending} className="a-btn a-btn--ghost">
              {liftPending ? "Levée…" : "Lever le bannissement"}
            </button>
            {liftState.error !== undefined && <p className="a-form-error">{liftState.error}</p>}
          </form>
        </>
      ) : (
        <form action={banAction} onReset={keepFormInput} className="a-form">
          <input type="hidden" name="userId" value={userId} />

          <label className="a-field">
            <span className="a-label">Durée</span>
            <Select
              name="duration"
              defaultValue="7d"
              aria-label="Durée du bannissement"
              options={BAN_DURATIONS.map((duration) => ({
                value: duration.key,
                label: duration.label,
              }))}
            />
          </label>

          <label className="a-field">
            <span className="a-label">Motif</span>
            <textarea
              name="reason"
              required
              minLength={30}
              maxLength={500}
              rows={4}
              className="a-textarea"
              placeholder="Propos injurieux répétés dans le forum, malgré deux avertissements."
            />
            <span className="a-field-hint">
              Obligatoire. Repris tel quel dans l&apos;e-mail et sur l&apos;écran que la personne
              verra en se connectant. C&apos;est aussi ce qu&apos;elle pourra contester.
            </span>
          </label>

          <button type="submit" disabled={banPending} className="a-btn a-btn--danger">
            {banPending ? "Bannissement…" : "Bannir ce compte"}
          </button>

          {banState.error !== undefined && <p className="a-form-error">{banState.error}</p>}
        </form>
      )}

      {history.length > 0 && (
        <div className="a-table-wrap" style={{ marginTop: 20 }}>
          <table className="a-table">
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id}>
                  <td className="mono">{entry.issuedOn}</td>
                  <td>{entry.reason}</td>
                  <td align="right">
                    <span className="mono a-field-hint">{entry.outcome}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
