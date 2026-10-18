"use client";

import React, { useTransition } from "react";
import type { TicketStatus } from "@cyberlearn/db";
import { Select } from "@cyberlearn/ui";
import { notifyResult } from "@/lib/notify";
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
 * The status, stated and changed by the same control. What the server answers
 * is said in a toast: the new status, or its refusal, the control then staying
 * on the status the ticket still has.
 */
export function TicketStatusSelect({
  ticketId,
  currentStatus,
}: TicketStatusSelectProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();

  return (
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
        startTransition(async () => {
          const result = await updateTicketStatusAction(ticketId, next);
          notifyResult(result, {
            success: `Ticket passé au statut « ${STATUS_LABELS[next]} ».`,
            error: "Le statut n'a pas pu être changé.",
          });
        });
      }}
    />
  );
}
