"use client";

// "use client" justified: the send is two steps - check, then confirm - held
// in state, and the fields stay locked while the message is read back.

import React, { useState, useTransition } from "react";
import { ANNOUNCEMENT_LIMITS, type AnnouncementInput } from "@/lib/announcement";
import { Card } from "../../../_components/admin-ui";
import {
  countAnnouncementRecipientsAction,
  sendAnnouncementAction,
} from "../../../announcements/_actions/announcement-actions";

type Stage = { step: "edit" } | { step: "confirm" } | { step: "sent"; title: string };

/**
 * Writing to one account: a notification in the bell of the site and in the
 * app, sent through the announcements (audience USER), so it is checked,
 * rate-limited and kept in their history like any other. The first button has
 * the server check the message and the account; the message is then read back
 * and sent by the second. It cannot be taken back once sent.
 *
 * A banned account cannot sign in to read it: the card says so instead.
 */
export function MessageForm({
  userId,
  name,
  banned,
}: {
  userId: string;
  /** Who the card names: the display name, else the @handle. */
  name: string;
  banned: boolean;
}): React.ReactElement {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [stage, setStage] = useState<Stage>({ step: "edit" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (banned) {
    return (
      <Card title="Écrire à ce compte" pad>
        <p className="a-form-notice">
          Ce compte est banni : il ne peut pas se connecter pour lire un message. Lève le
          bannissement d&apos;abord, ou réponds-lui sur son ticket.
        </p>
      </Card>
    );
  }

  function input(): AnnouncementInput {
    return { title, body, actionUrl, audience: { kind: "USER", userId } };
  }

  function check(event: React.SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await countAnnouncementRecipientsAction(input());
      if (result.ok) setStage({ step: "confirm" });
      else setError(result.error);
    });
  }

  function send(): void {
    setError(null);
    startTransition(async () => {
      const result = await sendAnnouncementAction({ ...input(), confirmedRecipients: 1 });
      if (result.ok) {
        setStage({ step: "sent", title });
        setTitle("");
        setBody("");
        setActionUrl("");
        return;
      }
      setError(result.error);
      setStage({ step: "edit" });
    });
  }

  const confirming = stage.step === "confirm";

  return (
    <Card title="Écrire à ce compte" pad>
      <form onSubmit={check} className="a-form">
        <p className="a-form-notice">
          Une notification pour {name} uniquement, dans la cloche du site et dans l&apos;app. Sa
          page Notifications affiche le message en entier, retours à la ligne compris.
        </p>
        <fieldset
          disabled={confirming || pending}
          className="a-form"
          style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}
        >
          <label className="a-field">
            <span className="a-label">Titre</span>
            <input
              name="title"
              required
              minLength={ANNOUNCEMENT_LIMITS.titleMin}
              maxLength={ANNOUNCEMENT_LIMITS.titleMax}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              placeholder="Merci d'essayer Cyber Learn"
              className="a-input"
            />
            <span className="a-field-hint">
              {title.length} / {ANNOUNCEMENT_LIMITS.titleMax}
            </span>
          </label>

          <label className="a-field">
            <span className="a-label">Message</span>
            <textarea
              name="body"
              required
              maxLength={ANNOUNCEMENT_LIMITS.bodyMax}
              rows={7}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
              }}
              className="a-textarea"
            />
            <span className="a-field-hint">
              {body.length} / {ANNOUNCEMENT_LIMITS.bodyMax.toLocaleString("fr-FR")}
            </span>
          </label>

          <label className="a-field">
            <span className="a-label">
              Lien<span className="a-label-optional"> · optionnel</span>
            </span>
            <input
              name="actionUrl"
              maxLength={ANNOUNCEMENT_LIMITS.linkMax}
              value={actionUrl}
              onChange={(e) => {
                setActionUrl(e.target.value);
              }}
              placeholder="/paths"
              className="a-input"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="a-field-hint">
              Une page du site, qui commence par « / ». Sans lien, la notification ouvre sa page
              Notifications.
            </span>
          </label>
        </fieldset>

        {confirming ? (
          <div className="a-stack-tight">
            <p className="a-form-notice">
              Le message « {title.trim()} » partira à {name}. Il ne s&apos;annule pas.
            </p>
            <div className="a-row-actions">
              <button
                type="button"
                disabled={pending}
                onClick={send}
                className="a-btn a-btn--primary"
              >
                {pending ? "Envoi…" : "Envoyer le message"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setStage({ step: "edit" });
                }}
                className="a-btn a-btn--ghost"
              >
                Modifier
              </button>
            </div>
          </div>
        ) : (
          <div className="a-row-actions">
            <button type="submit" disabled={pending} className="a-btn a-btn--primary">
              {pending ? "…" : "Relire avant l'envoi"}
            </button>
          </div>
        )}

        {error !== null && (
          <p className="a-form-error" role="alert">
            {error}
          </p>
        )}
        {stage.step === "sent" && error === null && (
          <p className="a-form-notice" role="status">
            Le message « {stage.title.trim()} » est parti. Il figure dans l&apos;historique des
            annonces.
          </p>
        )}
      </form>
    </Card>
  );
}
