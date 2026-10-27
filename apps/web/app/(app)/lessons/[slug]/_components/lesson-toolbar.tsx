"use client";

// "use client" justification: it moves the reader between sections, opens the
// plan and the notes, and folds the app's sidebar (useSidebar), all of which
// is state held in the browser.

import React, { type ReactNode, useState } from "react";
import { SideDrawer } from "@cyberlearn/ui";
import { useSidebar } from "@/components/ui/sidebar";
import { LESSON_TOOLBAR_HEIGHT, NAVBAR_HEIGHT } from "@/lib/chrome";
import { NoteDrawer } from "./note-drawer";

/** Where the reader stands in the lesson: what the stepper knows of them. */
export interface SectionProgress {
  currentStep: number;
  doneSteps: ReadonlySet<number>;
  /**
   * The furthest section the reader has had on screen. Going back from it
   * with "Précédente" used to shut it in the plan: it was neither behind the
   * section on screen nor marked done.
   */
  furthestStep?: number;
  isCompleted: boolean;
  /** An administrator's preview: nothing to earn, so nothing is held shut. */
  reviewing?: boolean;
}

/**
 * Whether the reader may open a section other than the one on screen: one
 * they have finished, passed or already reached, or any once the lesson is
 * done, or any in an administrator's preview. A section ahead stays shut
 * until the ones before it are read, so that their exercises are not skipped.
 */
export function canOpenSection(
  index: number,
  { currentStep, doneSteps, furthestStep = 0, isCompleted, reviewing = false }: SectionProgress,
): boolean {
  return (
    isCompleted || reviewing || index < currentStep || index <= furthestStep || doneSteps.has(index)
  );
}

/** What holds the reader in a section: the toolbar's "next" and the end of the section say it. */
export function pendingMessage(count: number): string {
  return count === 1
    ? "1 exercice à compléter avant de continuer"
    : `${String(count)} exercices à compléter avant de continuer`;
}

/** "03" for 3: the counts read as a fixed-width code, like the headings' numbers. */
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** How a section stands for the reader: behind them, on screen, or still to read. */
export type SectionState = "done" | "current" | "ahead";

function sectionState(
  index: number,
  { currentStep, doneSteps, isCompleted }: SectionProgress,
): SectionState {
  if (index === currentStep) return "current";
  return isCompleted || doneSteps.has(index) ? "done" : "ahead";
}

/** The plan's words for a state, read after the section's name. */
const STATE_WORDS: Record<SectionState, string> = {
  done: "terminée",
  current: "en cours",
  ahead: "à venir",
};

/**
 * The bar's icons, drawn on the same 16px grid with square ends, like the
 * sidebar's: a rounded stroke read as the old interface.
 */
function Icon({ d }: { d: string }): React.ReactElement {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="lesson-toolbar__icon">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

const ICONS = {
  prev: "M13 8H3.5M7.5 4L3.5 8l4 4",
  next: "M3 8h9.5M8.5 4l4 4-4 4",
  finish: "M2.5 8.5l3.5 3.5L13.5 4",
  plan: "M6 4h8M6 8h8M6 12h8M2 4h1.5M2 8h1.5M2 12h1.5",
  notes: "M3 2h7l3 3v9H3zM6 7h4M6 10h4",
  focus: "M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4",
  lock: "M4.5 7.5h7v6h-7zM6 7.5V5a2 2 0 0 1 4 0v2.5",
} as const;

interface LessonToolbarProps extends SectionProgress {
  sections: readonly { text: string; id: string }[];
  totalSteps: number;
  /** The exercises of the section on screen are done, or the lesson is. */
  canAdvance: boolean;
  pendingCount: number;
  /** The lesson is being marked as completed. */
  isPending: boolean;
  xpReward: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (step: number) => void;
  /** Under the plan's sections: who wrote the lesson, the glossary note. */
  planExtra?: ReactNode;
  lessonId: string;
  lessonTitle: string;
  note: { content: string; wordCount: number };
}

/**
 * The lesson's one bar, stuck under the navbar while the reader scrolls:
 * where they are (section n of N, its name, a segment per section), the
 * previous and next sections, and three tools. "Plan" opens the list of
 * sections in a drawer, with the author and the glossary note; "Notes" opens
 * the reader's note on the lesson; "Mode focus" folds the app's sidebar to
 * give the lesson its width, and is remembered by the sidebar's own cookie.
 *
 * The segments are a pointer's shortcut to a section the reader may open
 * (canOpenSection), the plan's list in miniature. They are out of the tab
 * order and hidden from assistive technology: the plan says the same, named,
 * and the count says where the reader is.
 *
 * It replaces four ways of saying the same thing: the briefing card's
 * progress, the timeline of sections above the article, the outline in the
 * right rail and the bar under the article, each with its own count.
 */
export function LessonToolbar({
  sections,
  currentStep,
  totalSteps,
  doneSteps,
  furthestStep = 0,
  isCompleted,
  reviewing = false,
  canAdvance,
  pendingCount,
  isPending,
  xpReward,
  onPrev,
  onNext,
  onJump,
  planExtra,
  lessonId,
  lessonTitle,
  note,
}: LessonToolbarProps): React.ReactElement {
  const [planOpen, setPlanOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();

  const isLastStep = currentStep === totalSteps - 1;
  // Nothing to finish in a preview: the last section ends the reading.
  const finishing = isLastStep && !isCompleted && !reviewing;
  const nextDisabled = isPending || !canAdvance || (isLastStep && !finishing);
  const pendingNotice = !canAdvance && pendingCount > 0 ? pendingMessage(pendingCount) : undefined;
  const sectionName = sections[currentStep]?.text ?? "";
  const progressState = { currentStep, doneSteps, furthestStep, isCompleted, reviewing };

  return (
    <>
      <div className="lesson-toolbar" style={{ top: NAVBAR_HEIGHT, height: LESSON_TOOLBAR_HEIGHT }}>
        <div className="lesson-toolbar__where">
          <span className="lesson-toolbar__count">
            <span className="lesson-toolbar__word">Section </span>
            <b>{pad(currentStep + 1)}</b>
            <span className="lesson-toolbar__total">/{pad(totalSteps)}</span>
          </span>
          <div className="lesson-toolbar__track">
            {sectionName !== "" && <span className="lesson-toolbar__name">{sectionName}</span>}
            <div className="lesson-toolbar__segments" aria-hidden="true">
              {Array.from({ length: totalSteps }, (_, i) => {
                const state = sectionState(i, progressState);
                const name = sections[i]?.text ?? "";
                const title = name === "" ? `Section ${pad(i + 1)}` : `${pad(i + 1)} · ${name}`;
                return i !== currentStep && canOpenSection(i, progressState) ? (
                  <button
                    // SAFETY: index key is stable - sections don't reorder after page load
                    key={i}
                    type="button"
                    tabIndex={-1}
                    className="lesson-toolbar__segment"
                    data-state={state}
                    title={title}
                    onClick={() => {
                      onJump(i);
                    }}
                  />
                ) : (
                  // SAFETY: index key is stable - sections don't reorder after page load
                  <span key={i} className="lesson-toolbar__segment" data-state={state} />
                );
              })}
            </div>
          </div>
        </div>

        <div className="lesson-toolbar__group lesson-toolbar__steps">
          <button
            type="button"
            className="lesson-toolbar__btn"
            onClick={onPrev}
            disabled={currentStep === 0}
            aria-label="Section précédente"
          >
            <Icon d={ICONS.prev} />
            <span className="lesson-toolbar__label">Précédente</span>
          </button>
          <button
            type="button"
            className="lesson-toolbar__btn lesson-toolbar__btn--next"
            onClick={onNext}
            disabled={nextDisabled}
            aria-label={finishing ? "Terminer la leçon" : "Section suivante"}
            title={pendingNotice}
          >
            {isPending ? (
              <>
                <span className="lesson-toolbar__busy" aria-hidden="true">
                  <span />
                </span>
                <span className="lesson-toolbar__label">Validation…</span>
              </>
            ) : finishing ? (
              <>
                <Icon d={ICONS.finish} />
                <span className="lesson-toolbar__label">Terminer</span>
                {canAdvance && <span className="lesson-toolbar__xp">+{xpReward} XP</span>}
              </>
            ) : (
              <>
                {pendingNotice !== undefined && <Icon d={ICONS.lock} />}
                <span className="lesson-toolbar__label">Suivante</span>
                {pendingNotice === undefined && <Icon d={ICONS.next} />}
              </>
            )}
          </button>
        </div>

        <span className="lesson-toolbar__sep" aria-hidden="true" />

        <div className="lesson-toolbar__group lesson-toolbar__tools">
          <button
            type="button"
            className="lesson-toolbar__btn lesson-toolbar__tool"
            onClick={() => {
              setPlanOpen(true);
            }}
            aria-haspopup="dialog"
            aria-expanded={planOpen}
            aria-label="Plan de la leçon"
          >
            <Icon d={ICONS.plan} />
            <span className="lesson-toolbar__label">Plan</span>
          </button>
          <button
            type="button"
            className="lesson-toolbar__btn lesson-toolbar__tool"
            onClick={() => {
              setNotesOpen((v) => !v);
            }}
            aria-haspopup="dialog"
            aria-expanded={notesOpen}
            aria-label="Notes"
          >
            <Icon d={ICONS.notes} />
            <span className="lesson-toolbar__label">Notes</span>
          </button>
          {/* Folds the sidebar beside the page. Below 1024px the sidebar is a
              drawer over the page already, and the button is not drawn. */}
          <button
            type="button"
            className="lesson-toolbar__btn lesson-toolbar__tool lesson-toolbar__focus"
            onClick={() => {
              setSidebarOpen(!sidebarOpen);
            }}
            aria-pressed={!sidebarOpen}
            aria-label="Mode focus"
            title="Replier la barre latérale"
          >
            <Icon d={ICONS.focus} />
            <span className="lesson-toolbar__label">Mode focus</span>
          </button>
        </div>
      </div>

      {/* The drawers are the bar's siblings, not its children: the bar is
          sticky, and a fixed panel or a dialog drawn inside it would be
          placed and layered by it rather than by the page. */}
      <SideDrawer
        open={planOpen}
        onClose={() => {
          setPlanOpen(false);
        }}
        title="Plan de la leçon"
        meta={`${String(sections.length)} section${sections.length > 1 ? "s" : ""}`}
        closeLabel="Fermer le plan"
        className="lesson-tools"
        width={420}
      >
        <div className="lesson-plan">
          <nav aria-label="Sections de la leçon">
            <ol className="lesson-plan__list">
              {sections.map((section, i) => {
                const state = sectionState(i, progressState);
                const current = state === "current";
                const open = current || canOpenSection(i, progressState);
                return (
                  // SAFETY: index key is stable - sections don't reorder after page load
                  <li key={i}>
                    <button
                      type="button"
                      className="lesson-plan__item"
                      data-state={state}
                      aria-current={current ? "step" : undefined}
                      disabled={!open}
                      onClick={() => {
                        if (!current) onJump(i);
                        setPlanOpen(false);
                      }}
                    >
                      <span className="lesson-plan__num">{pad(i + 1)}</span>
                      <span className="lesson-plan__text">{section.text}</span>
                      <span className="lesson-plan__mark">
                        {state === "done" ? (
                          <Icon d={ICONS.finish} />
                        ) : current ? (
                          <span className="lesson-plan__here" />
                        ) : open ? null : (
                          <Icon d={ICONS.lock} />
                        )}
                        <span className="sr-only">, {STATE_WORDS[state]}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          {planExtra}
        </div>
      </SideDrawer>

      <NoteDrawer
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        initialContent={note.content}
        initialWordCount={note.wordCount}
        open={notesOpen}
        onClose={() => {
          setNotesOpen(false);
        }}
      />
    </>
  );
}
