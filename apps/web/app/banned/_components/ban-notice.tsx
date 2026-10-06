"use client";

import React, { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import styles from "../banned.module.css";
import { ModalShell } from "@/components/modal-shell";
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
      {/* Closing it, by any of its buttons, is the acknowledgement; Escape and
          the backdrop do not count as reading it. */}
      <ModalShell
        open={open}
        onClose={() => {
          close(false);
        }}
        dismissable={false}
        eyebrow={<span style={{ color: "#ff6b7a" }}>Accès suspendu</span>}
        title="Ton compte est banni."
        accent="var(--color-danger)"
        maxWidth={520}
        actions={
          <>
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
          </>
        }
      >
        <div className={styles.notice}>
          <p className={styles.noticeText}>{endsLabel}</p>
          <p className={styles.reason}>{reason}</p>
        </div>
      </ModalShell>

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
