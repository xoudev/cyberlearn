"use client";

// "use client" justification: the guide is a window over the catalogue. It
// opens and closes in place, and suggests from the answers as they are sent.

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { suggestPaths } from "@cyberlearn/lib/paths/suggest";
import { ModalShell } from "@/components/modal-shell";
import { AnswerRecap } from "@/app/_components/path-guide/guide-answers";
import { GuideQuestions } from "@/app/_components/path-guide/guide-questions";
import { GuideSuggestions } from "@/app/_components/path-guide/guide-suggestions";
import { readGuideForm, type LearningAnswers, type SuggestedPath } from "@/lib/paths/guide-answers";

/**
 * "Pas sûr de par où commencer ?": the onboarding's two questions, in a
 * window over the catalogue rather than on a page of their own.
 *
 * The catalogue page hands over the paths the guide may suggest (the public
 * catalogue, never a class's own) and the answers given before; the
 * suggestions are worked out here, by the same rules as the onboarding
 * (@cyberlearn/lib/paths/suggest), with nothing to wait for and nothing
 * recorded.
 */
export function PathGuideDialog({
  catalogue,
  saved,
}: {
  catalogue: SuggestedPath[];
  saved: Partial<LearningAnswers>;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<LearningAnswers>>(saved);
  const [answers, setAnswers] = useState<LearningAnswers | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(
    () => (answers === null ? [] : suggestPaths(catalogue, answers)),
    [answers, catalogue],
  );

  return (
    <>
      <button
        type="button"
        className="pc2-guide"
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(true);
        }}
      >
        <span className="pc2-guide__tag">Guide</span>
        Pas sûr de par où commencer ? Deux questions pour te proposer un parcours
        <span aria-hidden="true">→</span>
      </button>

      <ModalShell
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        eyebrow="Guide"
        title="Trouver ton parcours"
        maxWidth={720}
      >
        <div className="pg-dialog">
          <p className="pg-dialog__intro">
            Deux questions, et deux ou trois parcours pour commencer, chacun avec sa raison. Ce sont
            des suggestions : rien n&apos;est enregistré ni imposé.
          </p>
          {answers === null ? (
            <GuideQuestions
              // Remounted on each round, so the boxes tick what was last sent.
              key={JSON.stringify(draft)}
              answers={draft}
              error={error}
              submitLabel="Voir mes suggestions"
              onSubmit={(form) => {
                const view = readGuideForm(form);
                setDraft(view.draft);
                setError(view.error);
                setAnswers(view.answers);
              }}
            />
          ) : (
            <>
              <AnswerRecap
                answers={answers}
                onEdit={() => {
                  setDraft(answers);
                  setAnswers(null);
                }}
              />
              <GuideSuggestions
                suggestions={suggestions}
                cta={(path, i) => (
                  <Link
                    href={`/paths/${path.slug}`}
                    className={i === 0 ? "btn btn--block" : "btn btn--ghost btn--block"}
                  >
                    Voir ce parcours <span aria-hidden="true">→</span>
                  </Link>
                )}
              />
            </>
          )}
        </div>
      </ModalShell>
    </>
  );
}
