"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Zap } from "lucide-react";
import { completeLesson } from "../_actions/track-progress";
import type { CompleteLessonResult } from "../_actions/track-progress";

interface CompleteButtonProps {
  lessonId: string;
  xpReward: number;
  fullWidth?: boolean;
  variant?: "primary" | "ghost";
  onComplete: (result: CompleteLessonResult) => void;
}

export function CompleteButton({
  lessonId,
  xpReward,
  fullWidth,
  variant = "primary",
  onComplete,
}: CompleteButtonProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleComplete() {
    startTransition(async () => {
      const res = await completeLesson(lessonId);
      if (res.alreadyCompleted) {
        router.refresh();
      } else {
        onComplete(res);
        // refresh happens when the parent closes the modal
      }
    });
  }

  return (
    <>
      <button
        onClick={handleComplete}
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-60"
        style={
          variant === "ghost"
            ? {
                background: "transparent",
                color: "#7F7BA9",
                border: "1px solid #2A2560",
                borderRadius: 0,
                padding: fullWidth ? "10px 16px" : "10px 20px",
                width: fullWidth ? "100%" : undefined,
                transition: "color 180ms ease, background 180ms ease",
              }
            : {
                background: "linear-gradient(135deg, #0024FF, var(--cosmetic-accent))",
                color: "#ffffff",
                borderRadius: 0,
                padding: fullWidth ? "10px 16px" : "10px 20px",
                width: fullWidth ? "100%" : undefined,
                boxShadow: "0 4px 16px rgba(0,36,255,0.25), inset 0 0 0 1px rgba(255,255,255,0.15)",
                transition: "box-shadow 180ms ease, filter 180ms ease",
              }
        }
        onMouseEnter={(e) => {
          if (variant === "ghost") {
            e.currentTarget.style.color = "#F5F5FA";
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          } else {
            e.currentTarget.style.boxShadow =
              "0 4px 40px rgba(0,36,255,0.55), inset 0 0 0 1px rgba(255,255,255,0.2)";
            e.currentTarget.style.filter = "brightness(1.08)";
          }
        }}
        onMouseLeave={(e) => {
          if (variant === "ghost") {
            e.currentTarget.style.color = "#7F7BA9";
            e.currentTarget.style.background = "transparent";
          } else {
            e.currentTarget.style.boxShadow =
              "0 4px 16px rgba(0,36,255,0.25), inset 0 0 0 1px rgba(255,255,255,0.15)";
            e.currentTarget.style.filter = "";
          }
        }}
      >
        {isPending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <CheckCircle size={14} />
        )}
        {isPending ? (
          "Enregistrement…"
        ) : variant === "ghost" ? (
          "Marquer terminé"
        ) : (
          <>
            Valider la leçon
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px]"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <Zap size={9} />+{xpReward} XP
            </span>
          </>
        )}
      </button>
    </>
  );
}
