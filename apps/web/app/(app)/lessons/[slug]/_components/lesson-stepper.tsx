"use client";

import React, {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SECTION_PARAM, sectionFromQuery } from "@cyberlearn/lib/revisions/passage";
import { addressWith } from "@/hooks/use-query-dialog";
import { StepperContext, type StepperContextType } from "./section-pane";
import { completeLesson } from "../_actions/track-progress";
import type { CompleteLessonResult } from "../_actions/track-progress";
import { LessonCompleteModal } from "./lesson-complete-modal";
import { LessonToolbar, canOpenSection, pendingMessage } from "./lesson-toolbar";
import { LESSON_ARTICLE_CLASS } from "./lesson-article";

// ── Per-section exercise state ─────────────────────────────────────────────────

interface ExerciseState {
  required: Map<number, Set<string>>;
  done: Map<number, Set<string>>;
}

/** The exercises already done when the lesson opens, held done for their sections. */
function seedExerciseState(done: readonly { step: number; id: string }[]): ExerciseState {
  const doneByStep = new Map<number, Set<string>>();
  for (const { step, id } of done) {
    const ids = doneByStep.get(step) ?? new Set<string>();
    ids.add(id);
    doneByStep.set(step, ids);
  }
  return { required: new Map<number, Set<string>>(), done: doneByStep };
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
      // Only the requirement goes: what was done stays done, for the whole
      // page. A section off screen is unmounted, and a Python challenge or a
      // playground comes back without its result: forgetting that it was
      // done held the section again, behind an exercise already passed.
      const req = cloneSet(state.required.get(action.step));
      if (!req.has(action.id)) return state;
      req.delete(action.id);
      return { ...state, required: cloneMap(state.required).set(action.step, req) };
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

/** The id the address's fragment names (`#quiz-q-1`), if any. */
function hashTarget(): string | null {
  const fragment = window.location.hash.slice(1);
  if (fragment === "") return null;
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

interface LessonStepperProps {
  children: ReactNode;
  lessonId: string;
  lessonTitle: string;
  xpReward: number;
  isCompleted: boolean;
  /**
   * An administrator previewing a lesson nobody else can open yet. Every
   * section opens, no exercise holds them, and there is no "Terminer": the
   * page says nothing is recorded, and finishing would record a completion.
   */
  reviewing?: boolean;
  sections: { text: string; id: string }[];
  /**
   * The section to open on, from 0: the one a "Revoir ce passage" link asks
   * for (`?section=`), which the page passes only where every section may be
   * opened already (a finished lesson, an administrator's preview). Read on
   * the first render only: a passage asked for later, the lesson on screen,
   * is read off the address.
   */
  initialStep?: number;
  /**
   * A lesson not finished opens where the reader stopped (lib/lessons/resume.ts):
   * the sections they got through, marked done in the plan, and the exercises
   * they already passed, held done so that their section is not shut again.
   * Read on the first render only.
   */
  initialDoneSteps?: readonly number[];
  initialExercisesDone?: readonly { step: number; id: string }[];
  /** Under the plan's sections, in the toolbar's drawer: the author, the glossary note. */
  planExtra?: ReactNode;
  /** The reader's note on the lesson, as saved. */
  note: { content: string; wordCount: number };
}

/**
 * The lesson, one section at a time: the toolbar that moves between them (and
 * opens the plan and the notes), the article showing the current one, and at
 * its end what stops the reader going on, or says the lesson is done.
 */
export function LessonStepper({
  children,
  lessonId,
  lessonTitle,
  xpReward,
  isCompleted,
  reviewing = false,
  sections,
  initialStep = 0,
  initialDoneSteps = [],
  initialExercisesDone = [],
  planExtra,
  note,
}: LessonStepperProps): React.ReactElement {
  const totalSteps = Math.max(1, sections.length);
  const firstStep = Math.min(Math.max(0, initialStep), totalSteps - 1);

  const [currentStep, setCurrentStep] = useState(firstStep);
  const [doneSteps, setDoneSteps] = useState<ReadonlySet<number>>(() =>
    isCompleted
      ? new Set(Array.from({ length: totalSteps }, (_el, i) => i))
      : new Set(initialDoneSteps.filter((step) => step < totalSteps)),
  );
  // The furthest section the reader has had on screen: going back from it
  // with "Précédente" leaves it open in the plan, where it used to shut.
  const [furthestStep, setFurthestStep] = useState(firstStep);
  const [exerciseState, dispatchExercise] = useReducer(
    exerciseReducer,
    initialExercisesDone,
    seedExerciseState,
  );
  const exerciseStateRef = useRef(exerciseState);
  exerciseStateRef.current = exerciseState;
  const [completionResult, setCompletionResult] = useState<CompleteLessonResult | null>(null);
  // Why the server recorded nothing: said at the end of the lesson, where the
  // completion modal would have shown a lesson finished for 0 XP.
  const [refusal, setRefusal] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // A new section starts at its top, below the navbar and the toolbar (the
  // page's scroll-padding-top). The reader asks for it from wherever they are
  // in the previous one, usually its end, so without this they landed in the
  // middle of the next section, or past its end. Skipped on the first render:
  // opening a lesson must not move the page.
  const articleRef = useRef<HTMLElement>(null);
  const shownStepRef = useRef(currentStep);
  /** The element a passage asked for (below), brought into view instead of the section's top. */
  const passageTargetRef = useRef<string | null>(null);
  useEffect(() => {
    if (shownStepRef.current === currentStep) return;
    shownStepRef.current = currentStep;
    const article = articleRef.current;
    if (!article) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targetId = passageTargetRef.current;
    passageTargetRef.current = null;
    const target = targetId === null ? null : document.getElementById(targetId);
    (target ?? article).scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    // Keyboard and screen-reader users start the new section too, not on a
    // button that is now far below them.
    article.focus({ preventScroll: true });
  }, [currentStep]);

  // "Revoir ce passage" over the lesson already on screen (revisions/passage.ts):
  // `?section=` asks for a section, `#quiz-<id>` for the question in it. The
  // page opened on the section it asked for, but the reader may have moved
  // on since, and the stepper keeps its own section. So the request is met
  // here, then taken off the address: the same link followed again later
  // changes the address again, and is heard again. Met only where every
  // section may be opened already, as the page does.
  const requestedSection = useSearchParams().get(SECTION_PARAM);
  useEffect(() => {
    if (requestedSection === null) return;
    if (isCompleted || reviewing) {
      const step = sectionFromQuery(requestedSection, totalSteps);
      // On its section already, the question is in the page, and the
      // navigation has brought it into view.
      if (step !== shownStepRef.current) passageTargetRef.current = hashTarget();
      setCurrentStep(step);
      setFurthestStep((furthest) => Math.max(furthest, step));
    }
    // Through the History API, which Next follows without asking the server
    // for the page again (hooks/use-query-dialog.ts).
    window.history.replaceState(null, "", addressWith(window.location.href, SECTION_PARAM, null));
  }, [requestedSection, isCompleted, reviewing, totalSteps]);

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
  const canAdvance = reviewing || isCompleted || stepComp.isAllComplete;
  const isLastStep = currentStep === totalSteps - 1;

  // ── Navigation ────────────────────────────────────────────────────────────────

  function handlePrev() {
    setCurrentStep((s) => Math.max(0, s - 1));
  }

  function handleNext() {
    if (!canAdvance) return;
    if (isLastStep && !isCompleted && !reviewing) {
      setRefusal(null);
      startTransition(async () => {
        const res = await completeLesson(lessonId);
        if (res.refusal !== null) {
          // The page reads the lesson again: a lock it did not know about,
          // say, shows as the locked lesson.
          setRefusal(res.refusal);
          router.refresh();
        } else if (res.alreadyCompleted) {
          router.refresh();
        } else {
          setCompletionResult(res);
          // refresh on modal close
        }
      });
    } else if (!isLastStep) {
      setDoneSteps((prev) => new Set([...prev, currentStep]));
      setFurthestStep((f) => Math.max(f, currentStep + 1));
      setCurrentStep((s) => s + 1);
    }
  }

  function handleModalClose() {
    setCompletionResult(null);
    router.refresh();
  }

  function handleJump(i: number) {
    if (i === currentStep) return;
    if (canOpenSection(i, { currentStep, doneSteps, furthestStep, isCompleted, reviewing })) {
      setCurrentStep(i);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <StepperContext.Provider value={ctx}>
      <LessonToolbar
        sections={sections}
        currentStep={currentStep}
        totalSteps={totalSteps}
        doneSteps={doneSteps}
        furthestStep={furthestStep}
        isCompleted={isCompleted}
        reviewing={reviewing}
        canAdvance={canAdvance}
        pendingCount={stepComp.pendingCount}
        isPending={isPending}
        xpReward={xpReward}
        onPrev={handlePrev}
        onNext={handleNext}
        onJump={handleJump}
        planExtra={planExtra}
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        note={note}
      />

      {/* MDX content - flows directly, no card wrapper per design. Its prose
          keeps a reading measure, its components the article's width
          (globals.css). */}
      <article
        ref={articleRef}
        tabIndex={-1}
        aria-label={sections[currentStep]?.text}
        className={LESSON_ARTICLE_CLASS}
        style={{ counterReset: `h2-counter ${String(currentStep)}`, outline: "none" }}
      >
        {children}
      </article>

      {/* What stops the reader going on: said where they finish reading,
          while the toolbar's "next" waits. */}
      {!canAdvance && stepComp.pendingCount > 0 && (
        <p className="lesson-pending" role="status">
          <span aria-hidden="true">›</span>
          {pendingMessage(stepComp.pendingCount)}
        </p>
      )}

      {refusal !== null && isLastStep && (
        <p className="lesson-pending" role="alert">
          <span aria-hidden="true">›</span>
          {refusal}
        </p>
      )}

      {isCompleted && isLastStep && <CompletionBanner xpReward={xpReward} />}

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

// ── CompletionBanner ───────────────────────────────────────────────────────────

function CompletionBanner({ xpReward }: { xpReward: number }): React.ReactElement {
  return (
    <div
      className="lesson-end"
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
          stroke="var(--color-bg-base)"
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
            color: "var(--color-text-muted)",
            margin: 0,
          }}
        >
          +{xpReward} XP crédités
        </p>
      </div>
    </div>
  );
}
