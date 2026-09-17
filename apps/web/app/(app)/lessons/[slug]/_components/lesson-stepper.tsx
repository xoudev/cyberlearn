"use client";

import React, {
  type ReactNode,
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Zap } from "lucide-react";
import { StepperContext, type StepperContextType } from "./section-pane";
import { completeLesson } from "../_actions/track-progress";
import type { CompleteLessonResult } from "../_actions/track-progress";
import { LessonCompleteModal } from "./lesson-complete-modal";

// ── Per-section exercise state ─────────────────────────────────────────────────

interface ExerciseState {
  required: Map<number, Set<string>>;
  done: Map<number, Set<string>>;
}

type ExerciseAction =
  | { type: "register"; step: number; id: string }
  | { type: "unregister"; step: number; id: string }
  | { type: "done"; step: number; id: string };

function exerciseReducer(state: ExerciseState, action: ExerciseAction): ExerciseState {
  const cloneMap = <V,>(m: Map<number, V>) => new Map(m);
  const cloneSet = (s: Set<string> | undefined) => new Set(s ?? []);

  switch (action.type) {
    case "register": {
      const req = cloneSet(state.required.get(action.step));
      if (req.has(action.id)) return state;
      req.add(action.id);
      return { ...state, required: cloneMap(state.required).set(action.step, req) };
    }
    case "unregister": {
      const req = cloneSet(state.required.get(action.step));
      const done = cloneSet(state.done.get(action.step));
      req.delete(action.id);
      done.delete(action.id);
      return {
        required: cloneMap(state.required).set(action.step, req),
        done: cloneMap(state.done).set(action.step, done),
      };
    }
    case "done": {
      const done = cloneSet(state.done.get(action.step));
      done.add(action.id);
      return { ...state, done: cloneMap(state.done).set(action.step, done) };
    }
    default:
      return state;
  }
}

// ── LessonStepper ─────────────────────────────────────────────────────────────

interface LessonStepperProps {
  children: ReactNode;
  lessonId: string;
  lessonTitle: string;
  xpReward: number;
  isCompleted: boolean;
  sections: { text: string; id: string }[];
  railExtra?: ReactNode;
}

export function LessonStepper({
  children,
  lessonId,
  lessonTitle,
  xpReward,
  isCompleted,
  sections,
  railExtra,
}: LessonStepperProps): React.ReactElement {
  const totalSteps = Math.max(1, sections.length);

  const [currentStep, setCurrentStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState<ReadonlySet<number>>(() =>
    isCompleted ? new Set(Array.from({ length: totalSteps }, (_el, i) => i)) : new Set<number>(),
  );
  const [exerciseState, dispatchExercise] = useReducer(exerciseReducer, {
    required: new Map<number, Set<string>>(),
    done: new Map<number, Set<string>>(),
  });
  const exerciseStateRef = useRef(exerciseState);
  exerciseStateRef.current = exerciseState;
  const [completionResult, setCompletionResult] = useState<CompleteLessonResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // ── Stable exercise dispatchers ──────────────────────────────────────────────

  const registerExercise = useCallback((step: number, id: string) => {
    dispatchExercise({ type: "register", step, id });
  }, []);

  const unregisterExercise = useCallback((step: number, id: string) => {
    dispatchExercise({ type: "unregister", step, id });
  }, []);

  const markExerciseDone = useCallback((step: number, id: string) => {
    dispatchExercise({ type: "done", step, id });
  }, []);

  // Stable - reads exerciseState via ref so ctx doesn't change on every register/unregister.
  // Without this, every exercise state update would propagate a new ctx to all SectionPane
  // consumers, causing a cascade of re-renders that exceeds React's render guard.
  const getStepCompletion = useCallback(
    (step: number) => {
      const req = exerciseStateRef.current.required.get(step) ?? new Set<string>();
      const done = exerciseStateRef.current.done.get(step) ?? new Set<string>();
      const pending = [...req].filter((id) => !done.has(id));
      return {
        isAllComplete: req.size === 0 || pending.length === 0,
        pendingCount: pending.length,
      };
    },
    [], // stable - reads via ref
  );

  const ctx = useMemo<StepperContextType>(
    () => ({
      currentStep,
      registerExercise,
      unregisterExercise,
      markExerciseDone,
      getStepCompletion,
    }),
    [currentStep, registerExercise, unregisterExercise, markExerciseDone, getStepCompletion],
  );

  // ── Derived state ─────────────────────────────────────────────────────────────

  const stepComp = getStepCompletion(currentStep);
  const canAdvance = isCompleted || stepComp.isAllComplete;
  const isLastStep = currentStep === totalSteps - 1;

  // ── Navigation ────────────────────────────────────────────────────────────────

  function handlePrev() {
    setCurrentStep((s) => Math.max(0, s - 1));
  }

  function handleNext() {
    if (!canAdvance) return;
    if (isLastStep && !isCompleted) {
      startTransition(async () => {
        const res = await completeLesson(lessonId);
        if (res.alreadyCompleted) {
          router.refresh();
        } else {
          setCompletionResult(res);
          // refresh on modal close
        }
      });
    } else if (!isLastStep) {
      setDoneSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep((s) => s + 1);
    }
  }

  function handleModalClose() {
    setCompletionResult(null);
    router.refresh();
  }

  function handleJump(i: number) {
    if (i === currentStep) return;
    if (isCompleted || i < currentStep || doneSteps.has(i)) {
      setCurrentStep(i);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <StepperContext.Provider value={ctx}>
      {/* Timeline - only shown when multiple sections */}
      {sections.length > 1 && (
        <StepperTimeline
          sections={sections}
          currentStep={currentStep}
          doneSteps={doneSteps}
          onSelect={handleJump}
        />
      )}

      {/* Content grid */}
      <div className="lesson-stepper-grid">
        {/* Article + navigation */}
        <div>
          {/* MDX content - flows directly, no card wrapper per design */}
          <article
            className="prose lesson-content max-w-none"
            style={{ paddingBottom: 20, counterReset: `h2-counter ${String(currentStep)}` }}
          >
            {children}
          </article>

          {isCompleted && isLastStep ? (
            <CompletionBanner xpReward={xpReward} />
          ) : (
            <SectionNavBar
              currentStep={currentStep}
              totalSteps={totalSteps}
              sections={sections}
              isLastStep={isLastStep}
              canAdvance={canAdvance}
              isPending={isPending}
              xpReward={xpReward}
              pendingCount={stepComp.pendingCount}
              isCompleted={isCompleted}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          )}
        </div>

        {/* Right rail */}
        <aside className="lesson-stepper-rail">
          <StepperRail
            sections={sections}
            currentStep={currentStep}
            doneSteps={doneSteps}
            isCompleted={isCompleted}
            onSelect={handleJump}
            railExtra={railExtra}
          />
        </aside>
      </div>
      {completionResult !== null && (
        <LessonCompleteModal
          result={completionResult}
          lessonTitle={lessonTitle}
          onClose={handleModalClose}
        />
      )}
    </StepperContext.Provider>
  );
}

// ── StepperTimeline ────────────────────────────────────────────────────────────

function StepperTimeline({
  sections,
  currentStep,
  doneSteps,
  onSelect,
}: {
  sections: { text: string; id: string }[];
  currentStep: number;
  doneSteps: ReadonlySet<number>;
  onSelect: (i: number) => void;
}): React.ReactElement {
  return (
    <div
      style={{
        margin: "0 0 64px",
        padding: "28px 8px 24px",
        borderTop: "1px solid #1F1B47",
        borderBottom: "1px solid #1F1B47",
        position: "relative",
        overflowX: "auto",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--cosmetic-accent) 50%, transparent) 30%, rgba(0,36,255,0.5) 70%, transparent)",
          opacity: 0.5,
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "flex-start",
          gap: 0,
          minWidth: "max-content",
        }}
      >
        {/* Connector line - top: label(28) + margin(12) + half-diamond(7) */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            top: 47,
            height: 1,
            background: "#1F1B47",
            zIndex: 0,
          }}
        />

        {sections.map((section, i) => {
          const isDone = doneSteps.has(i);
          const isCurrent = i === currentStep;
          const isClickable = isDone || i < currentStep;

          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSelect(i);
              }}
              disabled={!isClickable && !isCurrent}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                zIndex: 1,
                flex: 1,
                textAlign: "center",
                minWidth: 0,
                padding: "0 4px",
                background: "transparent",
                border: "none",
                cursor: isClickable ? "pointer" : "default",
                opacity: isClickable || isCurrent ? 1 : 0.5,
              }}
            >
              {/* Label */}
              <div
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1.3,
                  maxWidth: 120,
                }}
              >
                <b
                  style={{
                    color: isDone ? "var(--cosmetic-accent)" : isCurrent ? "#F5F5FA" : "#3F3D5C",
                  }}
                >
                  {String(i + 1).padStart(2, "0")} · {section.text}
                </b>
              </div>

              {/* Diamond */}
              {isDone ? (
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    background: "var(--cosmetic-accent)",
                    border: "1.5px solid var(--cosmetic-accent)",
                    transform: "rotate(45deg)",
                    boxShadow:
                      "0 0 8px color-mix(in srgb, var(--cosmetic-accent) 60%, transparent)",
                    flexShrink: 0,
                  }}
                />
              ) : isCurrent ? (
                <span
                  className="timeline-node-current"
                  style={{
                    display: "inline-block",
                    width: 18,
                    height: 18,
                    background: "#030219",
                    border: "2px solid var(--cosmetic-accent)",
                    transform: "rotate(45deg)",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    background: "#030219",
                    border: "1.5px solid #2A2560",
                    transform: "rotate(45deg)",
                    flexShrink: 0,
                  }}
                />
              )}

              {/* Sub-label */}
              <div
                style={{
                  marginTop: 10,
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 10,
                  color: isDone ? "var(--cosmetic-accent)" : isCurrent ? "#F5F5FA" : "#3F3D5C",
                  letterSpacing: "0.08em",
                }}
              >
                {isDone ? "✓" : isCurrent ? "~ en cours" : "-"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── StepperRail ────────────────────────────────────────────────────────────────

function StepperRail({
  sections,
  currentStep,
  doneSteps,
  isCompleted,
  onSelect,
  railExtra,
}: {
  sections: { text: string; id: string }[];
  currentStep: number;
  doneSteps: ReadonlySet<number>;
  isCompleted: boolean;
  onSelect: (i: number) => void;
  railExtra?: ReactNode;
}): React.ReactElement {
  const completedCount = isCompleted ? sections.length : doneSteps.size;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* TOC section */}
      <div>
        {/* Section header - rail-v2__head style */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#3F3D5C",
            marginBottom: 14,
            paddingBottom: 10,
            borderBottom: "1px solid #1F1B47",
          }}
        >
          <span>Dans cette leçon</span>
          <b style={{ color: "var(--cosmetic-accent)", fontWeight: 700 }}>
            {completedCount}/{sections.length}
          </b>
        </div>

        {/* TOC items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {sections.map((entry, i) => {
            const isDone = isCompleted || doneSteps.has(i);
            const isCurrent = !isCompleted && i === currentStep;
            const isClickable = isDone || i < currentStep;

            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onSelect(i);
                }}
                disabled={!isClickable && !isCurrent}
                style={{
                  display: "grid",
                  gridTemplateColumns: "24px 1fr auto",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px 10px 14px",
                  marginLeft: -2,
                  background: isCurrent
                    ? "linear-gradient(90deg, color-mix(in srgb, var(--cosmetic-accent) 8%, transparent), transparent 80%)"
                    : "transparent",
                  boxShadow: isCurrent
                    ? "-2px 0 12px color-mix(in srgb, var(--cosmetic-accent) 25%, transparent)"
                    : "none",
                  color: isCurrent ? "#F5F5FA" : isDone ? "#B8B5D1" : "#44406B",
                  cursor: isClickable ? "pointer" : "default",
                  border: "none",
                  borderLeft: `2px solid ${isCurrent ? "var(--cosmetic-accent)" : "transparent"}`,
                  textAlign: "left",
                  width: "100%",
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: 14,
                  transition: "all 150ms ease",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 10,
                    color: isDone || isCurrent ? "var(--cosmetic-accent)" : "#3F3D5C",
                    letterSpacing: "0.1em",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontWeight: isCurrent ? 500 : 400 }}>{entry.text}</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 10,
                    color: isDone || isCurrent ? "var(--cosmetic-accent)" : "#3F3D5C",
                    letterSpacing: "0.06em",
                  }}
                >
                  {isDone ? "✓" : isCurrent ? "~" : "-"}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Extra rail sections (lesson author + rating) */}
      {railExtra}
    </div>
  );
}

// ── SectionNavBar - sticky bottom section navigation ─────────────────────────

function SectionNavBar({
  currentStep,
  totalSteps,
  sections,
  isLastStep,
  canAdvance,
  isPending,
  xpReward,
  pendingCount,
  isCompleted,
  onPrev,
  onNext,
}: {
  currentStep: number;
  totalSteps: number;
  sections: { text: string; id: string }[];
  isLastStep: boolean;
  canAdvance: boolean;
  isPending: boolean;
  xpReward: number;
  pendingCount: number;
  isCompleted: boolean;
  onPrev: () => void;
  onNext: () => void;
}): React.ReactElement {
  const disabled = !canAdvance || isPending;
  const sectionName = sections[currentStep]?.text ?? "";

  return (
    <div>
      {/* Pending exercises warning */}
      {!canAdvance && pendingCount > 0 && (
        <div
          style={{
            marginTop: 16,
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
          <span>›</span>
          {pendingCount === 1
            ? "1 exercice à compléter avant de continuer"
            : `${String(pendingCount)} exercices à compléter avant de continuer`}
        </div>
      )}

      {/* Sticky section nav */}
      <div className="section-nav-bar">
        {/* Gradient border overlay */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            padding: 1,
            background: "linear-gradient(135deg, rgba(0,36,255,0.4), transparent 60%)",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            pointerEvents: "none",
          }}
        />

        {/* Left: Previous */}
        <button
          type="button"
          onClick={onPrev}
          disabled={currentStep === 0}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "18px 24px",
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: currentStep === 0 ? "default" : "pointer",
            background: "transparent",
            color: currentStep === 0 ? "#2A2560" : "#6B6890",
            border: 0,
            minHeight: 60,
            transition: "color 180ms ease, background 180ms ease",
          }}
          onMouseEnter={(e) => {
            if (currentStep > 0) {
              e.currentTarget.style.color = "#F5F5FA";
              e.currentTarget.style.background =
                "color-mix(in srgb, var(--cosmetic-accent) 3%, transparent)";
            }
          }}
          onMouseLeave={(e) => {
            if (currentStep > 0) {
              e.currentTarget.style.color = "#6B6890";
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <svg viewBox="0 0 14 14" width={12} height={12} fill="none">
            <path
              d="M11 7 H3 M6 4 L3 7 L6 10"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Précédent
        </button>

        {/* Center: current section info */}
        <div className="section-nav-center">
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#3F3D5C",
            }}
          >
            Section {String(currentStep + 1).padStart(2, "0")} /{" "}
            {String(totalSteps).padStart(2, "0")}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "var(--cosmetic-accent)",
              marginTop: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {sectionName}
          </span>
        </div>

        {/* Right: Next / Finish */}
        <button
          type="button"
          disabled={disabled}
          onClick={onNext}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "18px 24px",
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            background: disabled ? "rgba(0,36,255,0.15)" : "#0024FF",
            color: disabled ? "#2A2560" : "#ffffff",
            border: 0,
            cursor: disabled ? "not-allowed" : "pointer",
            boxShadow: disabled
              ? "none"
              : "inset 0 0 0 1px rgba(255,255,255,0.15), 0 0 30px rgba(0,36,255,0.3)",
            transition: "background 180ms ease",
            opacity: disabled ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!disabled) e.currentTarget.style.background = "#1F3BFF";
          }}
          onMouseLeave={(e) => {
            if (!disabled) e.currentTarget.style.background = "#0024FF";
          }}
        >
          {isPending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : isLastStep && !isCompleted ? (
            <>
              <CheckCircle size={14} />
              Terminer la leçon
              {canAdvance && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 6px",
                    background: "rgba(255,255,255,0.15)",
                    fontSize: 10,
                  }}
                >
                  <Zap size={9} />+{xpReward} XP
                </span>
              )}
            </>
          ) : (
            <>
              Section suivante
              <svg viewBox="0 0 14 14" width={12} height={12} fill="none">
                <path
                  d="M3 7 H11 M8 4 L11 7 L8 10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── CompletionBanner ───────────────────────────────────────────────────────────

function CompletionBanner({ xpReward }: { xpReward: number }): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: 20,
        background: "color-mix(in srgb, var(--cosmetic-accent) 5%, transparent)",
        border: "1px solid color-mix(in srgb, var(--cosmetic-accent) 25%, transparent)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          display: "grid",
          placeItems: "center",
          background: "var(--cosmetic-accent)",
          boxShadow: "0 0 20px color-mix(in srgb, var(--cosmetic-accent) 35%, transparent)",
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
            color: "var(--cosmetic-accent)",
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
