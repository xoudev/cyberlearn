"use client";

import React, { useState, useOptimistic, useTransition } from "react";
import { notifyResult } from "@/lib/notify";
import { toneColor } from "./admin-ui";
import { CONTENT_STATUS, type ContentStatus } from "./content-status";

function statusMeta(status: ContentStatus): { color: string; label: string } {
  const { label, tone } = CONTENT_STATUS[status];
  return { color: toneColor(tone), label };
}

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
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState<ContentStatus>(currentStatus);
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(confirmed);

  const meta = statusMeta(optimisticStatus);
  const options = ALL.filter((s) => s !== optimisticStatus);

  function pick(next: ContentStatus) {
    setOpen(false);
    startTransition(async () => {
      setOptimisticStatus(next);
      const res = await action(entityId, next);
      // In a toast rather than a popup under the badge: the badge sits in a
      // table, whose overflow clipped the popup, and the success said nothing.
      const ok = notifyResult(res, {
        success: `Statut mis à jour : ${statusMeta(next).label.toLowerCase()}.`,
        error: "Le statut n'a pas pu être changé.",
      });
      if (ok) setConfirmed(next);
    });
  }

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        title="Changer le statut"
        disabled={isPending}
        onClick={() => {
          if (!isPending) setOpen((v) => !v);
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 8px",
          background: "transparent",
          border: `1px solid color-mix(in srgb, ${meta.color} 27%, transparent)`,
          cursor: isPending ? "wait" : "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: meta.color,
          whiteSpace: "nowrap",
          transition: "border-color 120ms ease",
        }}
      >
        {isPending ? (
          <span
            style={{
              display: "inline-block",
              animation: "spin 0.8s linear infinite",
            }}
          >
            ⟳
          </span>
        ) : (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: meta.color,
              flexShrink: 0,
            }}
          />
        )}
        {meta.label}
        {!isPending && (
          <svg
            width="7"
            height="5"
            viewBox="0 0 7 5"
            fill="none"
            style={{ opacity: 0.5, flexShrink: 0 }}
          >
            <path
              d="M1 1L3.5 4L6 1"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {open && (
        <>
          <div
            aria-hidden="true"
            onClick={() => {
              setOpen(false);
            }}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              zIndex: 50,
              background: "var(--a-surface)",
              border: "1px solid var(--a-border-2)",
              boxShadow: "0 8px 24px color-mix(in srgb, var(--a-bg) 60%, transparent)",
              minWidth: 120,
              overflow: "hidden",
            }}
          >
            {options.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  pick(s);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "9px 12px",
                  background: "transparent",
                  border: "none",
                  borderBottom: i < options.length - 1 ? "1px solid var(--a-border)" : "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: statusMeta(s).color,
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: statusMeta(s).color,
                    flexShrink: 0,
                  }}
                />
                {statusMeta(s).label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
