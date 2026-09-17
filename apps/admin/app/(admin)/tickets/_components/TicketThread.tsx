"use client";

import React, { useRef, useTransition } from "react";
import { UI } from "../../_components/admin-ui";
import { replyToTicketAction } from "../../_actions/ticket-actions";

/**
 * The conversation on a ticket, and the box that adds to it.
 *
 * Replying was the missing half of this console: the queue could be sorted and
 * its statuses changed, but the only way to actually answer somebody was to
 * open a mail client and hope the thread stayed together. Now the answer lives
 * on the ticket, reaches the requester's own page, and goes out by e-mail with
 * the text in it rather than a summons to come and read it.
 */

export interface ThreadMessage {
  id: string;
  body: string;
  fromStaff: boolean;
  /** Pre-formatted by the server, which owns the locale. */
  stamp: string;
  authorName: string | null;
}

export function TicketThread({
  ticketId,
  requesterName,
  openingMessage,
  openingStamp,
  messages,
}: {
  ticketId: string;
  requesterName: string;
  openingMessage: string;
  openingStamp: string;
  messages: ThreadMessage[];
}): React.ReactElement {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const send = (formData: FormData): void => {
    const body = formData.get("body");
    setError(null);
    start(async () => {
      const res = await replyToTicketAction(ticketId, typeof body === "string" ? body : "");
      if (res.ok) formRef.current?.reset();
      else setError(res.error ?? "Envoi impossible.");
    });
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
        {/* The ticket's own message is the first turn, not a header above the
            thread: a reply under a heading looks like it answers nothing. */}
        <Bubble who={requesterName} stamp={openingStamp} body={openingMessage} staff={false} />
        {messages.map((m) => (
          <Bubble
            key={m.id}
            who={m.fromStaff ? (m.authorName ?? "Équipe") : requesterName}
            stamp={m.stamp}
            body={m.body}
            staff={m.fromStaff}
          />
        ))}
      </ol>

      <form ref={formRef} action={send} style={{ display: "grid", gap: 8 }}>
        <textarea
          name="body"
          required
          minLength={2}
          maxLength={5000}
          rows={5}
          placeholder="Répondre au demandeur…"
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "rgba(3,2,25,0.6)",
            border: `1px solid ${UI.border}`,
            color: UI.fg,
            fontFamily: UI.mono,
            fontSize: 13,
            lineHeight: 1.6,
            outline: "none",
            resize: "vertical",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="submit"
            disabled={pending}
            style={{
              justifySelf: "start",
              padding: "9px 16px",
              fontFamily: UI.mono,
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#fff",
              background: UI.blue,
              border: `1px solid ${UI.blue}`,
              cursor: pending ? "default" : "pointer",
              opacity: pending ? 0.5 : 1,
            }}
          >
            {pending ? "…" : "Envoyer la réponse"}
          </button>
          <span style={{ fontFamily: UI.mono, fontSize: 10.5, color: UI.muted }}>
            Part par e-mail et s&apos;affiche sur sa page. Un ticket ouvert passe en cours.
          </span>
        </div>
        {error !== null && (
          <p style={{ margin: 0, fontFamily: UI.mono, fontSize: 11.5, color: UI.danger }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

function Bubble({
  who,
  stamp,
  body,
  staff,
}: {
  who: string;
  stamp: string;
  body: string;
  staff: boolean;
}): React.ReactElement {
  return (
    <li
      style={{
        padding: "11px 14px",
        background: staff ? "rgba(10,255,212,0.05)" : "rgba(5,4,26,0.5)",
        border: `1px solid ${staff ? "rgba(10,255,212,0.25)" : UI.border}`,
        borderLeft: `3px solid ${staff ? UI.turquoise : UI.border}`,
      }}
    >
      <div
        style={{
          fontFamily: UI.mono,
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: staff ? UI.turquoise : UI.muted,
          marginBottom: 6,
        }}
      >
        {who} · {stamp}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 13.5,
          lineHeight: 1.65,
          color: UI.fg2,
          whiteSpace: "pre-wrap",
        }}
      >
        {body}
      </p>
    </li>
  );
}
