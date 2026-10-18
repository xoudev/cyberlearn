"use client";

import React, { useState, useTransition } from "react";
import { keepFormInput } from "@/lib/form-input";
import { addTicketNoteAction } from "../../_actions/ticket-actions";
import { Card, Tag } from "../../_components/admin-ui";
import { TICKET_CARDS } from "./ticket-columns";

/**
 * The notes the team leaves itself on a ticket.
 *
 * Its own card, drawn unlike the conversation on purpose - dashed, under an
 * « Équipe seulement » mark - so nobody types in the wrong box: what goes in
 * the thread is read by the requester, by e-mail and on their page; what goes
 * here never leaves the console. It is a table of its own, and no read made
 * for the site or the app selects it.
 */

export interface TicketNote {
  id: string;
  body: string;
  /** Pre-formatted by the server, which owns the locale. */
  stamp: string;
  authorName: string | null;
}

export function TicketNotes({
  ticketId,
  notes,
  open,
}: {
  ticketId: string;
  notes: readonly TicketNote[];
  /** Whether the ticket still takes a note: decided by the server from its status. */
  open: boolean;
}): React.ReactElement {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Bumped once a note is saved, so the box starts over empty; a refusal
  // keeps the draft.
  const [saved, setSaved] = useState(0);

  const add = (formData: FormData): void => {
    const body = formData.get("body");
    setError(null);
    start(async () => {
      const res = await addTicketNoteAction(ticketId, typeof body === "string" ? body : "");
      if (res.ok) setSaved((count) => count + 1);
      else setError(res.error ?? "La note n'a pas pu être enregistrée.");
    });
  };

  return (
    <Card title={TICKET_CARDS.notes} action={<Tag tone="purple">Équipe seulement</Tag>} pad>
      <div style={{ display: "grid", gap: 12 }}>
        <p className="a-field-hint" style={{ margin: 0 }}>
          Jamais montrées au demandeur, ni sur le site ni dans l&apos;app.
        </p>

        {notes.length > 0 && (
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {notes.map((note) => (
              <li
                key={note.id}
                style={{
                  padding: "10px 12px",
                  border: "1px dashed var(--a-border-2)",
                  borderLeft: "3px solid var(--a-purple)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--a-purple)",
                    marginBottom: 5,
                  }}
                >
                  {note.authorName ?? "Ancien administrateur"} · {note.stamp}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "var(--a-fg-2)",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {note.body}
                </p>
              </li>
            ))}
          </ol>
        )}

        {/* The same gate as the thread (AGENTS.md, rule 16): a finished
            ticket takes nothing new, from anybody. Its notes stay readable. */}
        {!open ? (
          <p className="a-field-hint" style={{ margin: 0 }}>
            Ce ticket est terminé. Repasse-le en cours pour ajouter une note.
          </p>
        ) : (
          <form key={saved} action={add} onReset={keepFormInput} className="a-form">
            <textarea
              name="body"
              required
              minLength={2}
              maxLength={5000}
              rows={3}
              className="a-textarea"
              aria-label="Note interne"
              placeholder="Pour l'équipe : contexte, suite à donner…"
            />
            <button type="submit" disabled={pending} className="a-btn a-btn--ghost">
              {pending ? "Enregistrement…" : "Ajouter la note"}
            </button>
            {error !== null && (
              <p className="a-form-error" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </Card>
  );
}
