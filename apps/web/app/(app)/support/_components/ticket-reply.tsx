"use client";

import React, { useActionState, useRef } from "react";
import { replyToTicketAction, type ReplyState } from "../_actions/reply-actions";

/**
 * Adding a turn to one's own ticket.
 *
 * The box empties itself on success. A reply that stays in the field after it
 * has been sent is how the same message gets sent twice.
 */
export function TicketReply({ ticketId }: { ticketId: string }): React.ReactElement {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ReplyState, FormData>(
    async (prev, formData) => {
      const result = await replyToTicketAction(prev, formData);
      if (result.ok === true) formRef.current?.reset();
      return result;
    },
    {},
  );

  return (
    <form ref={formRef} action={formAction} className="cls-assign__form tk-reply">
      <input type="hidden" name="ticketId" value={ticketId} />

      <label className="cls-field">
        <span className="cls-field__label">Répondre</span>
        <textarea
          name="body"
          required
          minLength={2}
          maxLength={5000}
          rows={4}
          className="cls-input"
          placeholder="Ajoute une précision, ou réponds à l'équipe…"
        />
      </label>

      <button type="submit" disabled={pending} className="cls-btn">
        {pending ? "…" : "Envoyer"}
      </button>

      {state.error !== undefined && (
        <p className="cls-alert" data-tone="bad">
          {state.error}
        </p>
      )}
      {state.ok === true && <p className="cls-alert">Envoyé.</p>}
    </form>
  );
}
