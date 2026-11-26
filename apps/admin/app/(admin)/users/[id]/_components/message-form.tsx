"use client";

// "use client" justified: the send is two steps - read back, then send - held
// in state, and the field stays locked while the message is read back.

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { MESSAGE_BODY_MAX } from "@cyberlearn/lib/messages/rules";
import { Card } from "../../../_components/admin-ui";
import { sendTeamMessageAction } from "../../../messages/_actions/team-message-actions";

type Stage = { step: "edit" } | { step: "confirm" } | { step: "sent"; conversationId: string };

/**
 * Writing to one account as the CyberLearn team: a message in its
 * conversation with the team, which it reads in its messages panel (and in its
 * notifications, for the app) and can answer there. The answers come back to
 * the console's inbox. Read back before it is sent: it cannot be taken back.
 *
 * Mounted on the account's page and under a conversation in the inbox. A
 * banned account cannot sign in to read it: the card says so instead.
 */
export function MessageForm({
  userId,
  name,
  banned,
  conversationId = null,
  title = "Écrire à ce compte",
}: {
  userId: string;
  /** Who the card names: the display name, else the @handle. */
  name: string;
  banned: boolean;
  /** The conversation with the team, when there is one: the card links to it. */
  conversationId?: string | null;
  title?: string;
}): React.ReactElement {
  const [body, setBody] = useState("");
  const [stage, setStage] = useState<Stage>({ step: "edit" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (banned) {
    return (
      <Card title={title} pad>
        <p className="a-form-notice">
          Ce compte est banni : il ne peut pas se connecter pour lire un message. Lève le
          bannissement d&apos;abord, ou réponds-lui sur son ticket.
        </p>
      </Card>
    );
  }

  function send(): void {
    setError(null);
    startTransition(async () => {
      const result = await sendTeamMessageAction({ userId, body });
      if (result.ok) {
        setStage({ step: "sent", conversationId: result.conversationId });
        setBody("");
        return;
      }
      setError(result.error);
      setStage({ step: "edit" });
    });
  }

  const confirming = stage.step === "confirm";
  const thread = stage.step === "sent" ? stage.conversationId : conversationId;

  return (
    <Card title={title} pad>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          if (body.trim() === "") {
            setError("Écris un message.");
            return;
          }
          setStage({ step: "confirm" });
        }}
        className="a-form"
      >
        <p className="a-form-notice">
          Un message de l&apos;équipe CyberLearn pour {name}, dans ses messages sur le site, sans
          rien à accepter, et dans ses notifications. Ses réponses arrivent dans{" "}
          {thread !== null ? (
            <Link href={`/messages/${thread}`}>cette conversation</Link>
          ) : (
            <Link href="/messages">Messages</Link>
          )}
          , et sa première réponse t&apos;arrive aussi par e-mail. La conversation dit quand le
          message a été vu.
        </p>
        <label className="a-field">
          <span className="a-label">Message</span>
          <textarea
            name="body"
            required
            maxLength={MESSAGE_BODY_MAX}
            rows={7}
            value={body}
            disabled={confirming || pending}
            onChange={(e) => {
              setBody(e.target.value);
            }}
            className="a-textarea"
          />
          <span className="a-field-hint">
            {body.length} / {MESSAGE_BODY_MAX.toLocaleString("fr-FR")}
          </span>
        </label>

        {confirming ? (
          <div className="a-stack-tight">
            <p className="a-form-notice">
              Le message partira à {name}, signé « Équipe CyberLearn ». Il ne s&apos;annule pas.
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
              Relire avant l&apos;envoi
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
            Message envoyé.
          </p>
        )}
      </form>
    </Card>
  );
}
