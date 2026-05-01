"use client";

import React, { type ReactNode, useCallback, useMemo, useReducer } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Zap } from "lucide-react";
import { LessonCompletionContext } from "./lesson-completion-context";
import { completeLesson } from "../_actions/track-progress";

interface State {
  required: string[];
  done: Set<string>;
}

type Action =
  | { type: "register"; id: string }
  | { type: "unregister"; id: string }
  | { type: "done"; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "register":
      if (state.required.includes(action.id)) return state;
      return { ...state, required: [...state.required, action.id] };
    case "unregister":
      return {
        required: state.required.filter((id) => id !== action.id),
        done: new Set([...state.done].filter((id) => id !== action.id)),
      };
    case "done": {
      const next = new Set(state.done);
      next.add(action.id);
      return { ...state, done: next };
    }
    default:
      return state;
  }
}

interface LessonInteractiveShellProps {
  children: ReactNode;
  lessonId: string;
  xpReward: number;
  isCompleted: boolean;
}

export function LessonInteractiveShell({
  children,
  lessonId,
  xpReward,
  isCompleted,
}: LessonInteractiveShellProps): React.ReactElement {
  const [state, dispatch] = useReducer(reducer, { required: [], done: new Set<string>() });

  const register = useCallback((id: string) => {
    dispatch({ type: "register", id });
  }, []);
  const unregister = useCallback((id: string) => {
    dispatch({ type: "unregister", id });
  }, []);
  const markDone = useCallback((id: string) => {
    dispatch({ type: "done", id });
  }, []);

  const isAllComplete =
    state.required.length === 0 || state.required.every((id) => state.done.has(id));
  const pendingCount = state.required.filter((id) => !state.done.has(id)).length;

  const ctx = useMemo(
    () => ({ register, unregister, markDone, isAllComplete, pendingCount }),
    [register, unregister, markDone, isAllComplete, pendingCount],
  );

  return (
    <LessonCompletionContext.Provider value={ctx}>
      <div
        style={{
          marginBottom: 20,
          padding: "28px 32px",
          background: "#0A0826",
          border: "1px solid #1F1B47",
        }}
      >
        <article className="prose lesson-content max-w-none">{children}</article>
      </div>

      {isCompleted ? (
        <CompletionBanner xpReward={xpReward} />
      ) : (
        <GatedCompleteButton
          lessonId={lessonId}
          xpReward={xpReward}
          disabled={!isAllComplete}
          pendingCount={pendingCount}
        />
      )}
    </LessonCompletionContext.Provider>
  );
}

// ── Completion banner ──────────────────────────────────────────────────────────

function CompletionBanner({ xpReward }: { xpReward: number }): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: 20,
        background: "rgba(10,255,212,0.05)",
        border: "1px solid rgba(10,255,212,0.25)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          display: "grid",
          placeItems: "center",
          background: "#0AFFD4",
          boxShadow: "0 0 20px rgba(10,255,212,0.35)",
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 16 16"
          width={16}
          height={16}
          fill="none"
          stroke="#030219"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 8 L7 12 L13 4" />
        </svg>
      </div>
      <div>
        <p
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 700,
            color: "#0AFFD4",
            margin: 0,
            marginBottom: 2,
          }}
        >
          Leçon complétée
        </p>
        <p
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            color: "#6B6890",
            margin: 0,
          }}
        >
          +{xpReward} XP crédités
        </p>
      </div>
    </div>
  );
}

// ── Gated complete button ──────────────────────────────────────────────────────

function GatedCompleteButton({
  lessonId,
  xpReward,
  disabled,
  pendingCount,
}: {
  lessonId: string;
  xpReward: number;
  disabled: boolean;
  pendingCount: number;
}): React.ReactElement {
  const [isPending, startTransition] = React.useTransition();
  const router = useRouter();

  function handleComplete() {
    startTransition(async () => {
      await completeLesson(lessonId);
      router.refresh();
    });
  }

  return (
    <div>
      {disabled && pendingCount > 0 && (
        <div
          style={{
            marginBottom: 8,
            padding: "8px 14px",
            background: "rgba(255,176,32,0.06)",
            border: "1px solid rgba(255,176,32,0.2)",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            color: "#FFB020",
            letterSpacing: "0.1em",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "#FFB020" }}>›</span>
          {pendingCount === 1
            ? "1 exercice à compléter avant de valider"
            : `${String(pendingCount)} exercices à compléter avant de valider`}
        </div>
      )}
      <button
        onClick={handleComplete}
        disabled={isPending || disabled}
        className="inline-flex w-full items-center justify-center gap-2 font-mono text-[12px] font-bold uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: disabled ? "rgba(30,27,71,0.8)" : "linear-gradient(135deg, #0024FF, #0AFFD4)",
          color: disabled ? "#3F3D5C" : "#ffffff",
          borderRadius: 0,
          padding: "10px 16px",
          border: disabled ? "1px solid #2A2560" : "none",
          boxShadow: disabled
            ? "none"
            : "0 4px 16px rgba(0,36,255,0.25), inset 0 0 0 1px rgba(255,255,255,0.15)",
          transition: "box-shadow 180ms ease, filter 180ms ease",
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.boxShadow =
              "0 4px 40px rgba(0,36,255,0.55), inset 0 0 0 1px rgba(255,255,255,0.2)";
            e.currentTarget.style.filter = "brightness(1.08)";
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
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
        ) : (
          <>
            {disabled ? "Complète les exercices" : "Valider la leçon"}
            {!disabled && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px]"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                <Zap size={9} />+{xpReward} XP
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}
