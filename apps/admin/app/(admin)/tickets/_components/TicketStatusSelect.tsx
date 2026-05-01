"use client";

import React, { useTransition } from "react";
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

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as TicketStatus;
    startTransition(async () => {
      await updateTicketStatusAction(ticketId, newStatus);
    });
  }

  const color = STATUS_COLORS[currentStatus] ?? "#6B6890";

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={isPending}
      style={{
        background: "rgba(5,4,26,0.8)",
        border: `1px solid ${color}40`,
        color: color,
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "5px 10px",
        cursor: isPending ? "not-allowed" : "pointer",
        opacity: isPending ? 0.5 : 1,
        outline: "none",
      }}
    >
      {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
        <option key={s} value={s} style={{ background: "#0A0826", color: STATUS_COLORS[s] }}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
