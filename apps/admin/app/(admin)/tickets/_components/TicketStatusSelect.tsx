"use client";

import React, { useState, useTransition } from "react";
import type { TicketStatus } from "@cyberlearn/db";
import { Select } from "@cyberlearn/ui";
import { updateTicketStatusAction } from "../../_actions/ticket-actions";
import { isTicketStatus, TICKET_STATUSES } from "../ticket-meta";

const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: "var(--a-danger)",
  IN_PROGRESS: "var(--a-warning)",
  RESOLVED: "var(--a-accent)",
  CLOSED: "var(--a-faint)",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolu",
  CLOSED: "Fermé",
};

interface TicketStatusSelectProps {
  ticketId: string;
  currentStatus: TicketStatus;
}

/**
 * The status, stated and changed by the same control. A change the server
 * refuses is said under it, and the control stays on the status the ticket
 * still has.
 */
export function TicketStatusSelect({
  ticketId,
  currentStatus,
}: TicketStatusSelectProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span style={{ display: "inline-grid", gap: 4 }}>
      <Select
        block={false}
        triggerStyle={{
          padding: "5px 10px",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
        value={currentStatus}
        disabled={isPending}
        aria-label="Statut du ticket"
        options={TICKET_STATUSES.map((s) => ({
          value: s,
          label: STATUS_LABELS[s],
          tone: STATUS_COLORS[s],
        }))}
        onChange={(next) => {
          // Guard rather than cast: the options are ours, but the value comes
          // back out of the control as a plain string.
          if (!isTicketStatus(next) || next === currentStatus) return;
          setError(null);
          startTransition(async () => {
            const result = await updateTicketStatusAction(ticketId, next);
            if (!result.ok) setError(result.error ?? "Le statut n'a pas pu être changé.");
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
