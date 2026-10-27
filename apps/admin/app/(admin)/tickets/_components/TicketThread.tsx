"use client";

import React, { useState, useTransition } from "react";
import { keepFormInput } from "@/lib/form-input";
import { replyToTicketAction } from "../../_actions/ticket-actions";
import { UserAvatar } from "../../_components/admin-ui";

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
  /** The author's picture, resolved on the server (lib/avatar.ts). */
  authorAvatar: string | null;
}

export function TicketThread({
  ticketId,
  requesterName,
  requesterAvatar,
  openingMessage,
  openingStamp,
  messages,
  open,
}: {
  ticketId: string;
  requesterName: string;
  /** The requester's picture, resolved on the server; null for the initials. */
  requesterAvatar: string | null;
  openingMessage: string;
  openingStamp: string;
  messages: ThreadMessage[];
  /**
   * Whether the ticket still takes replies. Decided by the server from the
   * status, so this component does not carry a second copy of that rule.
   */
  open: boolean;
}): React.ReactElement {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Bumped once a reply is sent: the box starts over empty. Until then it
  // keeps the draft, a refusal included - a ticket closed in the meantime
  // must not take the answer someone was writing with it.
  const [sent, setSent] = useState(0);

  const send = (formData: FormData): void => {
    const body = formData.get("body");
    setError(null);
    start(async () => {
      const res = await replyToTicketAction(ticketId, typeof body === "string" ? body : "");
      if (res.ok) setSent((count) => count + 1);
      else setError(res.error ?? "Envoi impossible.");
    });
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
        {/* The ticket's own message is the first turn, not a header above the
            thread: a reply under a heading looks like it answers nothing. */}
        <Bubble
          who={requesterName}
          avatar={requesterAvatar}
          stamp={openingStamp}
          body={openingMessage}
          staff={false}
        />
        {messages.map((m) => (
          <Bubble
            key={m.id}
            who={m.fromStaff ? (m.authorName ?? "Équipe") : requesterName}
            avatar={m.fromStaff ? m.authorAvatar : requesterAvatar}
            stamp={m.stamp}
            body={m.body}
            staff={m.fromStaff}
          />
        ))}
      </ol>

      {/* A finished ticket keeps its thread and loses its box, on this side as
          much as on the requester's. Replying into one that the queue shows as
          resolved left the two screens disagreeing about whether it was over.
          Reopening it is a deliberate act, one control away. */}
      {!open ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            border: "1px solid var(--a-border)",
            background: "var(--a-surface)",
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--a-muted)",
          }}
        >
          Ce ticket est terminé. Repasse-le en cours pour reprendre la conversation.
        </p>
      ) : (
        <form key={sent} action={send} onReset={keepFormInput} style={{ display: "grid", gap: 8 }}>
          <textarea
            name="body"
            required
            minLength={2}
            maxLength={5000}
            rows={5}
            placeholder="Répondre au demandeur…"
            aria-label="Réponse au demandeur"
            className="a-textarea"
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button type="submit" disabled={pending} className="a-btn a-btn--primary">
              {pending ? "Envoi…" : "Envoyer la réponse"}
            </button>
            <span className="a-field-hint">
              Part par e-mail et s&apos;affiche sur sa page. Un ticket ouvert passe en cours.
            </span>
          </div>
          {error !== null && (
            <p className="a-form-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

function Bubble({
  who,
  avatar,
  stamp,
  body,
  staff,
}: {
  who: string;
  avatar: string | null;
  stamp: string;
  body: string;
  staff: boolean;
}): React.ReactElement {
  return (
    <li
      style={{
        padding: "11px 14px",
        background: "var(--a-surface)",
        border: `1px solid ${staff ? "var(--a-border-2)" : "var(--a-border)"}`,
        borderLeft: `3px solid ${staff ? "var(--a-accent)" : "var(--a-border)"}`,
      }}
    >
      <div className="a-person" style={{ marginBottom: 8 }}>
        <UserAvatar src={avatar} name={who} size={28} />
        <span className="a-person-text">
          <span className="a-person-name">
            {who}
            {staff ? <span className="a-person-meta"> · équipe</span> : null}
          </span>
          <span className="a-person-meta">{stamp}</span>
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 13.5,
          lineHeight: 1.65,
          color: "var(--a-fg-2)",
          whiteSpace: "pre-wrap",
        }}
      >
        {body}
      </p>
    </li>
  );
}
