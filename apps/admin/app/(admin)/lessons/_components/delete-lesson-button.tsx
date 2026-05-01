"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLessonAction } from "../_actions/lesson-actions";

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

export function DeleteLessonButton({
  lessonId,
  lessonTitle,
  disabled,
  disabledReason,
}: {
  lessonId: string;
  lessonTitle: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hov, setHov] = useState(false);

  function handleDelete() {
    if (
      !window.confirm(
        `Supprimer définitivement "${lessonTitle}" ?\n\nCette action est irréversible.`,
      )
    )
      return;

    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("lessonId", lessonId);
      const result = await deleteLessonAction({}, fd);
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
        title={disabled ? (disabledReason ?? "Action non disponible") : "Supprimer la leçon"}
        disabled={disabled || isPending}
        onClick={() => {
          handleDelete();
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
          width: 28,
          height: 28,
          background: hov && !disabled ? "rgba(255,71,87,0.08)" : "transparent",
          border: `1px solid ${hov && !disabled ? "rgba(255,71,87,0.3)" : "transparent"}`,
          borderRadius: 4,
          color: disabled ? "#2A2560" : hov ? "#FF4757" : "#44406B",
          cursor: disabled || isPending ? "not-allowed" : "pointer",
          transition: "all 120ms ease",
          flexShrink: 0,
        }}
      >
        {isPending ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "#FF4757",
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
            background: "#0A0826",
            border: "1px solid rgba(255,71,87,0.4)",
            borderRadius: 4,
            padding: "6px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "#FF4757",
            whiteSpace: "nowrap",
            zIndex: 50,
            maxWidth: 260,
            whiteSpaceCollapse: "preserve",
            lineHeight: 1.5,
          }}
        >
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            style={{
              marginLeft: 8,
              color: "#44406B",
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
