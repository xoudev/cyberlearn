"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notifyResult } from "@/lib/notify";
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
}): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hov, setHov] = useState(false);

  function handleDelete() {
    if (
      !window.confirm(
        `Supprimer définitivement "${lessonTitle}" ?\n\nCette action est irréversible.`,
      )
    )
      return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("lessonId", lessonId);
      const result = await deleteLessonAction({}, fd);
      // In a toast rather than a popup under the row: the table's overflow
      // clipped it, and a deletion that worked said nothing at all.
      const ok = notifyResult(result, {
        success: `Leçon « ${lessonTitle} » supprimée.`,
        error: "La suppression a échoué.",
      });
      if (ok) router.refresh();
    });
  }

  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "flex-end" }}>
      <button
        type="button"
        // Named, and red at rest: an icon in the table\'s faintest grey was the
        // only sign of an irreversible action.
        aria-label={`Supprimer la leçon « ${lessonTitle} »`}
        title={disabled ? (disabledReason ?? "Action non disponible") : "Supprimer la leçon"}
        disabled={(disabled ?? false) || isPending}
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
          background:
            hov && !disabled
              ? "color-mix(in srgb, var(--a-danger) 8%, transparent)"
              : "transparent",
          border: `1px solid ${hov && !disabled ? "color-mix(in srgb, var(--a-danger) 30%, transparent)" : "transparent"}`,
          borderRadius: 4,
          color: disabled ? "#2A2560" : "var(--a-danger)",
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
    </div>
  );
}
