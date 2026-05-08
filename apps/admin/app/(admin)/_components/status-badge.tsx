"use client";

import React, { useState, useOptimistic, useTransition } from "react";

type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

const META: Record<ContentStatus, { color: string; label: string }> = {
  DRAFT: { color: "#6B6890", label: "Brouillon" },
  PUBLISHED: { color: "#0AFFD4", label: "Publié" },
  ARCHIVED: { color: "#FF4757", label: "Archivé" },
};

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
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<ContentStatus>(currentStatus);
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(confirmed);

  const meta = META[optimisticStatus];
  const options = ALL.filter((s) => s !== optimisticStatus);

  function pick(next: ContentStatus) {
    setOpen(false);
    setError(null);
    startTransition(async () => {
      setOptimisticStatus(next);
      const res = await action(entityId, next);
      if (res.error) {
        setError(res.error);
      } else {
        setConfirmed(next);
      }
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
          border: `1px solid ${meta.color}44`,
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
              background: "#0A0826",
              border: "1px solid #2A2560",
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
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
                  borderBottom: i < options.length - 1 ? "1px solid #1F1B47" : "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: META[s].color,
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: META[s].color,
                    flexShrink: 0,
                  }}
                />
                {META[s].label}
              </button>
            ))}
          </div>
        </>
      )}

      {error !== null && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            zIndex: 50,
            background: "#0A0826",
            border: "1px solid rgba(255,71,87,0.4)",
            padding: "6px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "#FF4757",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {error}
          <button
            type="button"
            onClick={() => {
              setError(null);
            }}
            style={{
              color: "#44406B",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
