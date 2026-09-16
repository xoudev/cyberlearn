"use client";

import React, { useActionState, useState } from "react";
import { deleteUserAction, type DeleteUserState } from "../../../_actions/user-actions";
import { Card } from "../../../_components/admin-ui";

/**
 * The one action in the console nobody can review afterwards.
 *
 * So it asks for the account's own e-mail, typed. Not a checkbox, which is a
 * reflex, and not a modal, which is a reflex with a delay: the only thing
 * separating deleting the right account from deleting the one above it in a
 * sorted list is having looked at which row you are on, and typing the address
 * is how you look. The button stays disabled until it matches, and the server
 * checks it again against the row it is about to erase.
 */
export function DeleteUserForm({
  userId,
  email,
  displayName,
}: {
  userId: string;
  email: string;
  displayName: string;
}): React.ReactElement {
  const [state, formAction, pending] = useActionState<DeleteUserState, FormData>(
    deleteUserAction,
    {},
  );
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  if (state.ok === true) {
    return (
      <Card title="Compte supprimé" pad>
        <p className="a-form-notice">
          Le compte de {displayName} et ses données ont été effacés.
          {state.emailFailed === true && " L'e-mail d'information n'a pas pu être envoyé."}
          {state.authSurvived === true &&
            " L'identifiant de connexion a survécu à la suppression : il reste à retirer côté Supabase."}
        </p>
      </Card>
    );
  }

  return (
    <Card title="Zone dangereuse" pad>
      <p className="a-form-error">
        Supprimer ce compte efface définitivement le profil, les préférences, l&apos;avatar, la
        progression, les badges, les séries, les révisions, les attestations et leurs fichiers,
        ainsi que l&apos;identifiant de connexion. Les questions et réponses publiées dans les
        leçons restent en ligne, détachées du nom. Rien de tout cela ne se récupère.
      </p>

      <form action={formAction} className="a-form" style={{ marginTop: 16 }}>
        <input type="hidden" name="userId" value={userId} />

        <label className="a-field">
          <span className="a-label">
            Motif<span className="a-label-optional"> · optionnel</span>
          </span>
          <input name="reason" maxLength={300} className="a-input" placeholder="Compte de test" />
          <span className="a-field-hint">
            Repris tel quel dans l&apos;e-mail envoyé à la personne. Laissé vide, aucun motif
            n&apos;est inventé.
          </span>
        </label>

        <label className="a-field">
          <span className="a-label">Confirme en saisissant l&apos;adresse du compte</span>
          <input
            name="confirmEmail"
            required
            autoComplete="off"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
            }}
            className="a-input"
            placeholder={email}
          />
          <span className="a-field-hint mono">{email}</span>
        </label>

        <button
          type="submit"
          disabled={pending || !matches}
          className="a-btn a-btn--danger"
          title={matches ? undefined : "Saisis l'adresse du compte pour activer ce bouton"}
        >
          {pending ? "Suppression…" : "Supprimer ce compte et toutes ses données"}
        </button>

        {state.error !== undefined && <p className="a-form-error">{state.error}</p>}
      </form>
    </Card>
  );
}
