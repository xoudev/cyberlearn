"use client";

// "use client" justification: it moves the reader between sections, opens the
// plan and the notes, and folds the app's sidebar (useSidebar), all of which
// is state held in the browser.

import React, { type ReactNode, useState } from "react";
import { CheckCircle, Zap } from "lucide-react";
import { SideDrawer } from "@cyberlearn/ui";
import { useSidebar } from "@/components/ui/sidebar";
import { LESSON_TOOLBAR_HEIGHT, NAVBAR_HEIGHT } from "@/lib/chrome";
import { NoteDrawer } from "./note-drawer";

/** Where the reader stands in the lesson: what the stepper knows of them. */
export interface SectionProgress {
  currentStep: number;
  doneSteps: ReadonlySet<number>;
  isCompleted: boolean;
  /** An administrator's preview: nothing to earn, so nothing is held shut. */
  reviewing?: boolean;
}

/**
 * Whether the reader may open a section other than the one on screen: one
 * they have finished or already passed, or any once the lesson is done, or
 * any in an administrator's preview. A section ahead stays shut until the ones
 * before it are read, so that their exercises are not skipped.
 */
export function canOpenSection(
  index: number,
  { currentStep, doneSteps, isCompleted, reviewing = false }: SectionProgress,
): boolean {
  return isCompleted || reviewing || index < currentStep || doneSteps.has(index);
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
 * where they are (section n of N, and a bar for it), the previous and next
 * sections, and three tools. "Plan" opens the list of sections in a drawer,
 * with the author and the glossary note; "Notes" opens the reader's note on
 * the lesson; "Mode focus" folds the app's sidebar to give the lesson its
 * width, and is remembered by the sidebar's own cookie.
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
  const progress = `${String(((currentStep + 1) / totalSteps) * 100)}%`;
  const progressState = { currentStep, doneSteps, isCompleted, reviewing };

  return (
    <>
      <div className="lesson-toolbar" style={{ top: NAVBAR_HEIGHT, height: LESSON_TOOLBAR_HEIGHT }}>
        <div className="lesson-toolbar__where">
          <span className="lesson-toolbar__count">
            <span className="lesson-toolbar__word">Section </span>
            <b>{pad(currentStep + 1)}</b>/{pad(totalSteps)}
          </span>
          <span className="lesson-toolbar__bar" aria-hidden="true">
            <span style={{ width: progress }} />
          </span>
          {sectionName !== "" && <span className="lesson-toolbar__name">{sectionName}</span>}
        </div>

        <div className="lesson-toolbar__group lesson-toolbar__steps">
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={onPrev}
            disabled={currentStep === 0}
            aria-label="Section précédente"
          >
            <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M11 7 H3 M6 4 L3 7 L6 10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="lesson-toolbar__label">Précédente</span>
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={onNext}
            disabled={nextDisabled}
            aria-label={finishing ? "Terminer la leçon" : "Section suivante"}
            title={pendingNotice}
          >
            {isPending ? (
              <span
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden="true"
              />
            ) : finishing ? (
              <>
                <CheckCircle aria-hidden="true" />
                <span className="lesson-toolbar__label">Terminer</span>
                {canAdvance && (
                  <span className="lesson-toolbar__xp">
                    <Zap size={9} aria-hidden="true" />+{xpReward} XP
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="lesson-toolbar__label">Suivante</span>
                <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
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

        <span className="lesson-toolbar__sep" aria-hidden="true" />

        <div className="lesson-toolbar__group">
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => {
              setPlanOpen(true);
            }}
            aria-haspopup="dialog"
            aria-expanded={planOpen}
            aria-label="Plan de la leçon"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M6 4h8M6 8h8M6 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <span className="lesson-toolbar__label">Plan</span>
          </button>
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => {
              setNotesOpen((v) => !v);
            }}
            aria-haspopup="dialog"
            aria-expanded={notesOpen}
            aria-label="Notes"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 2h7l3 3v9H3z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path
                d="M6 6h4M6 9h4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <span className="lesson-toolbar__label">Notes</span>
          </button>
          {/* Folds the sidebar beside the page. Below 1024px the sidebar is a
              drawer over the page already, and the button is not drawn. */}
          <button
            type="button"
            className="btn btn--sm btn--ghost lesson-toolbar__focus"
            onClick={() => {
              setSidebarOpen(!sidebarOpen);
            }}
            aria-pressed={!sidebarOpen}
            aria-label="Mode focus"
            title="Replier la barre latérale"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="lesson-toolbar__label">Mode focus</span>
          </button>
        </div>
      </div>

      {/* The drawers are the bar's siblings, not its children: the bar is
          sticky and blurs what is behind it, which would make it the box a
          fixed panel is placed in, and the layer a dialog is drawn in. */}
      <SideDrawer
        open={planOpen}
        onClose={() => {
          setPlanOpen(false);
        }}
        title="Plan de la leçon"
        meta={`${String(sections.length)} section${sections.length > 1 ? "s" : ""}`}
        closeLabel="Fermer le plan"
        width={420}
      >
        <div className="lesson-plan">
          <nav aria-label="Sections de la leçon">
            <ol className="lesson-plan__list">
              {sections.map((section, i) => {
                const current = i === currentStep;
                const done = isCompleted || doneSteps.has(i);
                const open = current || canOpenSection(i, progressState);
                return (
                  // SAFETY: index key is stable - sections don't reorder after page load
                  <li key={i}>
                    <button
                      type="button"
                      className="lesson-plan__item"
                      data-state={current ? "current" : done ? "done" : "ahead"}
                      aria-current={current ? "step" : undefined}
                      disabled={!open}
                      onClick={() => {
                        if (!current) onJump(i);
                        setPlanOpen(false);
                      }}
                    >
                      <span className="lesson-plan__num">{pad(i + 1)}</span>
                      <span className="lesson-plan__text">{section.text}</span>
                      <span className="lesson-plan__mark" aria-hidden="true">
                        {current ? "~" : done ? "✓" : "-"}
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
