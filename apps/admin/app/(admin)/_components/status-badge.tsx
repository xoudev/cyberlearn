"use client";

// Optimistic status updates use the shared portalled selector and its keyboard navigation.
import React, { useState, useOptimistic, useTransition } from "react";
import { Select } from "@cyberlearn/ui";
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
  const [error, setError] = useState<string | null>(null);
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
          setError(null);
          startTransition(async () => {
            setOptimisticStatus(next);
            const result = await action(entityId, next);
            if (result.error) setError(result.error);
            else setConfirmed(next);
          });
        }}
      />
      {error && (
        <p role="alert" className="a-form-error">
          {error}
        </p>
      )}
    </div>
  );
}
