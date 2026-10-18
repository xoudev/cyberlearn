"use client";

import React, { useState, useTransition } from "react";
import { Select } from "@cyberlearn/ui";
import { assignTicketAction } from "../../_actions/ticket-actions";

/** The value the control gives "nobody", which no account id can be. */
const NOBODY = "";

/**
 * Who has the ticket in hand, stated and changed by the same control, like the
 * status beside it. The list is the administrators: the action refuses anyone
 * else, so offering them would only offer a refusal.
 *
 * Never shown to the requester: the site's and the app's reads of a ticket do
 * not select it.
 */
export function TicketAssignee({
  ticketId,
  assigneeId,
  viewerId,
  admins,
}: {
  ticketId: string;
  assigneeId: string | null;
  /** The administrator reading the page, marked « toi » in the list. */
  viewerId: string;
  admins: readonly { id: string; name: string }[];
}): React.ReactElement {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span style={{ display: "inline-grid", gap: 4 }}>
      <Select
        block={false}
        triggerStyle={{ padding: "5px 10px", fontSize: 11 }}
        value={assigneeId ?? NOBODY}
        disabled={pending}
        aria-label="Administrateur assigné au ticket"
        options={[
          { value: NOBODY, label: "Personne" },
          ...admins.map((admin) => ({
            value: admin.id,
            label: admin.name,
            ...(admin.id === viewerId ? { hint: "toi" } : {}),
          })),
        ]}
        onChange={(next) => {
          if (next === (assigneeId ?? NOBODY)) return;
          setError(null);
          start(async () => {
            const result = await assignTicketAction(ticketId, next === NOBODY ? null : next);
            if (!result.ok) setError(result.error ?? "L'assignation n'a pas pu être changée.");
          });
        }}
      />
      {error !== null && (
        <span
          role="alert"
          className="mono"
          style={{
            maxWidth: 260,
            whiteSpace: "normal",
            fontSize: 10.5,
            lineHeight: 1.45,
            color: "var(--a-danger)",
          }}
        >
          {error}
        </span>
      )}
    </span>
  );
}
