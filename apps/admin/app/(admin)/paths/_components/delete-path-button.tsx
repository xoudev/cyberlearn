"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAdminConfirmation } from "../../_components/admin-confirmation";
import { deletePathAction } from "../_actions/path-actions";

function TrashIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="2,3 11,3" />
      <path d="M4.5 3V2h4v1" />
      <path d="M3 3l.7 8h5.6L10 3" />
      <line x1="5.5" y1="5.5" x2="5.5" y2="9" />
      <line x1="7.5" y1="5.5" x2="7.5" y2="9" />
    </svg>
  );
}

export function DeletePathButton({
  pathId,
  pathTitle,
  disabled,
  disabledReason,
}: {
  pathId: string;
  pathTitle: string;
  disabled?: boolean;
  disabledReason?: string;
}): React.JSX.Element {
  const router = useRouter();
  const confirm = useAdminConfirmation();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hov, setHov] = useState(false);

  async function handleDelete(): Promise<void> {
    if (
      !(await confirm(
        `Supprimer définitivement le parcours « ${pathTitle} » ?\n\nCette action est irréversible.`,
      ))
    )
      return;

    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("pathId", pathId);
      const result = await deletePathAction({}, fd);
      if (result.success) {
        router.refresh();
      } else if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "flex-end" }}>
      <button
        type="button"
        // Named, and red at rest: an icon in the table\'s faintest grey was the
        // only sign of an irreversible action.
        aria-label={`Supprimer le parcours « ${pathTitle} »`}
        title={disabled ? (disabledReason ?? "Action non disponible") : "Supprimer le parcours"}
        disabled={(disabled ?? false) || isPending}
        onClick={() => {
          void handleDelete();
        }}
        onMouseEnter={() => {
          setHov(true);
        }}
        onMouseLeave={() => {
          setHov(false);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          background:
            hov && !disabled
              ? "color-mix(in srgb, var(--a-danger) 8%, transparent)"
              : "transparent",
          border: `1px solid ${hov && !disabled ? "color-mix(in srgb, var(--a-danger) 30%, transparent)" : "transparent"}`,
          color: disabled ? "var(--a-muted)" : "var(--a-danger)",
          cursor: (disabled ?? false) || isPending ? "not-allowed" : "pointer",
          transition: "all 120ms ease",
          flexShrink: 0,
        }}
      >
        {isPending ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--a-danger)",
              animation: "spin 0.9s linear infinite",
              display: "inline-block",
            }}
          >
            ⟳
          </span>
        ) : (
          <TrashIcon />
        )}
      </button>

      {error && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            background: "var(--a-surface)",
            border: "1px solid color-mix(in srgb, var(--a-danger) 40%, transparent)",
            padding: "6px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--a-danger)",
            whiteSpace: "nowrap",
            zIndex: 50,
            maxWidth: 280,
            lineHeight: 1.5,
          }}
        >
          {error}
          <button
            type="button"
            onClick={() => {
              setError(null);
            }}
            style={{
              marginLeft: 8,
              color: "var(--a-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
