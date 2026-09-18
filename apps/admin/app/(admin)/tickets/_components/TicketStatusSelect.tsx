"use client";

import React, { useTransition } from "react";
import { Select } from "@cyberlearn/ui";
import { updateTicketStatusAction } from "../../_actions/ticket-actions";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: "#FF4757",
  IN_PROGRESS: "#FFB020",
  RESOLVED: "#0AFFD4",
  CLOSED: "#44406B",
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
      options={(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => ({
        value: s,
        label: STATUS_LABELS[s],
        tone: STATUS_COLORS[s],
      }))}
      onChange={(next) => {
        startTransition(async () => {
          await updateTicketStatusAction(ticketId, next as TicketStatus);
        });
      }}
    />
  );
}
