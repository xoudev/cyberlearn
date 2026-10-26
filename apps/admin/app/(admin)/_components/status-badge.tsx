"use client";

// Optimistic status updates use the shared portalled selector and its keyboard navigation.
import React, { useState, useOptimistic, useTransition } from "react";
import { Select } from "@cyberlearn/ui";
import { notifyResult } from "@/lib/notify";
import { toneColor } from "./admin-ui";
import { CONTENT_STATUS, type ContentStatus } from "./content-status";

const ALL: ContentStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

export function StatusBadge({
  entityId,
  currentStatus,
  action,
}: {
  entityId: string;
  currentStatus: ContentStatus;
  action: (id: string, status: ContentStatus) => Promise<{ error?: string }>;
}): React.JSX.Element {
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState<ContentStatus>(currentStatus);
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(confirmed);

  return (
    <div className="a-status-control">
      <Select
        value={optimisticStatus}
        disabled={isPending}
        block={false}
        aria-label="Changer le statut du contenu"
        triggerStyle={{ minHeight: 44, fontFamily: "var(--font-sans)", fontSize: 12 }}
        options={ALL.map((status) => ({
          value: status,
          label: CONTENT_STATUS[status].label,
          tone: toneColor(CONTENT_STATUS[status].tone),
        }))}
        onChange={(next) => {
          if (
            next === optimisticStatus ||
            (next !== "DRAFT" && next !== "PUBLISHED" && next !== "ARCHIVED")
          )
            return;
          startTransition(async () => {
            setOptimisticStatus(next);
            const result = await action(entityId, next);
            const ok = notifyResult(result, {
              success: `Statut mis à jour : ${CONTENT_STATUS[next].label.toLowerCase()}.`,
              error: "Le statut n’a pas pu être changé.",
            });
            if (ok) setConfirmed(next);
          });
        }}
      />
    </div>
  );
}
