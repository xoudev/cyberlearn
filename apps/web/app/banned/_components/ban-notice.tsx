"use client";

import React, { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import styles from "../banned.module.css";
import {
  acknowledgeBanAction,
  appealBanAction,
  type AppealState,
} from "../_actions/appeal-actions";

/**
 * The notice, and the appeal under it.
 *
 * The notice is a modal because somebody signing in and landing on a quiet page
 * reads it as the site being broken. It has the two buttons the decision needs:
 * close it, or answer it. Closing is recorded, so it is shown once rather than
 * every time they open a page - the page behind it still says everything.
 */
export function BanNotice({
  reason,
  endsLabel,
  alreadyAcknowledged,
  alreadyAppealed,
}: {
  reason: string;
  /** Already in French: "Ce bannissement est définitif." or "Il reste 3 jours." */
  endsLabel: string;
  alreadyAcknowledged: boolean;
  alreadyAppealed: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(!alreadyAcknowledged);
  const [appealOpen, setAppealOpen] = useState(false);
  const [, startAck] = useTransition();
  const [state, formAction, pending] = useActionState<AppealState, FormData>(appealBanAction, {});

  const sent = state.ok === true || alreadyAppealed;

  function close(thenOpenAppeal: boolean): void {
    setOpen(false);
    if (thenOpenAppeal) setAppealOpen(true);
    // Recorded so the notice is shown once. A failure here costs a second
    // showing, not access to anything, so nothing waits on it.
    startAck(() => {
      void acknowledgeBanAction();
    });
  }

  return (
    <>
      {open && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ban-modal-title"
        >
          <div className={styles.modal}>
            <p className={styles.code}>Accès suspendu</p>
            <h2 id="ban-modal-title" className={styles.modalTitle}>
              Ton compte est banni.
            </h2>
            <p className={styles.modalText}>{endsLabel}</p>
            <p className={styles.reason}>{reason}</p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.ghost}
                onClick={() => {
                  close(false);
                }}
              >
                Fermer
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  close(true);
                }}
              >
                Faire appel
              </button>
            </div>
          </div>
        </div>
      )}

      {sent ? (
        <p className={styles.sent}>
          Ton appel a été transmis à l&apos;équipe de modération. La réponse arrivera par e-mail :
          elle contient la décision, pas seulement un avis de passage.
        </p>
      ) : appealOpen ? (
        <form action={formAction}>
          <label className={styles.field}>
            <span className={styles.label}>Ton message</span>
            <textarea
              name="message"
              className={styles.textarea}
              required
              minLength={30}
              maxLength={4000}
              placeholder="Explique ce qui s'est passé, de ton point de vue."
            />
          </label>
          {state.error !== undefined && (
            <p className={styles.error} role="alert">
              {state.error}
            </p>
          )}
          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={pending}>
              {pending ? "Envoi…" : "Envoyer l'appel"}
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => {
                setAppealOpen(false);
              }}
            >
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              setAppealOpen(true);
            }}
          >
            Faire appel
          </button>
          <button
            type="button"
            className={styles.ghost}
            onClick={() => {
              void createSupabaseBrowserClient()
                .auth.signOut()
                .then(() => {
                  router.push("/login");
                });
            }}
          >
            Se déconnecter
          </button>
        </div>
      )}
    </>
  );
}
