"use client";

import React, { useActionState, useState } from "react";
import { resetProgressAction, type ResetProgressState } from "../../../_actions/user-actions";
import { Card } from "../../../_components/admin-ui";

/**
 * Putting an account back to its first day, keeping the account.
 *
 * Asks for the handle typed out, for the reason the deletion form asks for the
 * address: the thing separating the right row from the one above it is having
 * looked. Deliberately a different token from the one next to it on this page,
 * so a value pasted into the wrong form arms neither.
 *
 * It says what goes and what stays before it says how to run it. A control
 * that cannot be undone owes its reader that much, and "progression" on its
 * own does not tell anybody whether their certificates are included.
 */
export function ResetProgressForm({
  userId,
  handle,
  displayName,
}: {
  userId: string;
  /** Username when there is one, address for an account still onboarding. */
  handle: string;
  displayName: string;
}): React.ReactElement {
  const [state, formAction, pending] = useActionState<ResetProgressState, FormData>(
    resetProgressAction,
    {},
  );
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === handle.toLowerCase();

  if (state.ok === true && state.summary) {
    const s = state.summary;
    return (
      <Card title="Progression remise à zéro" pad>
        <p className="a-form-notice">
          {displayName} repart de zéro. {s.xpCleared.toLocaleString("fr-FR")} XP et le niveau{" "}
          {s.levelBefore} effacés, avec {s.lessonsCleared} leçon
          {s.lessonsCleared > 1 ? "s" : ""}, {s.pathsCleared} parcours, {s.badgesCleared} badge
          {s.badgesCleared > 1 ? "s" : ""} et {s.certificatesCleared} attestation
          {s.certificatesCleared > 1 ? "s" : ""}.
          {state.certificateFilesKept === true &&
            " Les PDF des attestations n'ont pas pu être retirés du stockage : ils restent à supprimer côté Supabase."}
        </p>
      </Card>
    );
  }

  return (
    <Card title="Remettre la progression à zéro" pad>
      <p className="a-form-notice">
        Efface l&apos;XP, le niveau, les séries, la progression des leçons et des parcours, les
        révisions, les badges, les quêtes, les défis, les cosmétiques et les attestations — fichiers
        compris. Le compte, son identité, ses préférences, ses classes, ses notes et tout ce
        qu&apos;il a publié restent en place. Le test de positionnement aussi : il ne se repasse
        pas. Rien de tout cela ne se récupère.
      </p>

      <form action={formAction} className="a-form" style={{ marginTop: 16 }}>
        <input type="hidden" name="userId" value={userId} />

        <label className="a-field">
          <span className="a-label">Confirme en saisissant l&apos;identifiant du compte</span>
          <input
            name="confirmHandle"
            required
            autoComplete="off"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
            }}
            className="a-input"
            placeholder={handle}
          />
          <span className="a-field-hint mono">{handle}</span>
        </label>

        <button
          type="submit"
          disabled={pending || !matches}
          className="a-btn a-btn--danger"
          title={matches ? undefined : "Saisis l'identifiant du compte pour activer ce bouton"}
        >
          {pending ? "Remise à zéro…" : "Remettre la progression à zéro"}
        </button>

        {state.error !== undefined && <p className="a-form-error">{state.error}</p>}
      </form>
    </Card>
  );
}
