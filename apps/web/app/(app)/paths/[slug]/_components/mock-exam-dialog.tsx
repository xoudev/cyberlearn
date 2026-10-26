"use client";

// "use client" justification: the presentation is a window over the path,
// opened and closed by the address in the browser; it reads the overview
// when it opens and leads to the exam with the router.

import { useRouter } from "next/navigation";
import React, { useEffect, useState, useTransition } from "react";
import { ModalShell } from "@cyberlearn/ui";
import { Skeleton, SkeletonText } from "@cyberlearn/ui";
import { useQueryDialog } from "@/hooks/use-query-dialog";
import type { MockOverview } from "@/lib/exam/mock-exam";
import { mockOverviewAction } from "../mock-exam/_actions/mock-exam-actions";
import { MOCK_QUERY, mockExamStartHref } from "../mock-exam/_components/mock-address";
import { MockExamIntro } from "../mock-exam/_components/mock-exam-intro";
import "../mock-exam/_components/mock-exam.css";

type Load = { kind: "loading" } | { kind: "failed" } | { kind: "ready"; overview: MockOverview };

/**
 * "Examen blanc" on a path's page, and the presentation it opens over the
 * path (?mock=1): what the exam covers, its rules, the attempts already made,
 * and "Commencer" (or "Reprendre", for an attempt still running).
 *
 * The presentation used to be the top of the exam's own page. It is a window
 * now, and the page only runs the exam: "Commencer" goes there with ?go=1 in
 * place of the window's step of the history (router.replace, as
 * docs/dev/dialogs.md has it), and the exam starts as the page opens. The
 * page's address without ?go=1 redirects here with the window open
 * (next.config.ts). It belongs to this page alone, so the page draws it
 * rather than the site-wide registry.
 */
export function MockExamDialog({
  slug,
  pathTitle,
}: {
  slug: string;
  pathTitle: string;
}): React.JSX.Element {
  const mock = useQueryDialog(MOCK_QUERY);
  return (
    <>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        style={{ marginTop: 10 }}
        title="Un entraînement chronométré : trois questions par module, le score par module, sans certificat ni XP"
        aria-haspopup="dialog"
        onClick={() => {
          mock.open();
        }}
      >
        Examen blanc
      </button>
      {/* Drawn only while open, so each opening reads the attempts anew. */}
      {mock.value !== null ? (
        <MockExamWindow slug={slug} pathTitle={pathTitle} onClose={mock.close} />
      ) : null}
    </>
  );
}

function MockExamWindow({
  slug,
  pathTitle,
  onClose,
}: {
  slug: string;
  pathTitle: string;
  onClose: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    mockOverviewAction(slug).then(
      (overview) => {
        if (!live) return;
        setLoad(overview === null ? { kind: "failed" } : { kind: "ready", overview });
      },
      () => {
        if (live) setLoad({ kind: "failed" });
      },
    );
    return () => {
      live = false;
    };
  }, [slug, attempt]);

  const close = (
    <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={pending}>
      Annuler
    </button>
  );

  let body: React.ReactNode;
  let actions: React.ReactNode = close;
  if (load.kind === "loading") {
    body = (
      <div className="mkx-window-wait" aria-busy="true">
        <p className="sr-only" role="status">
          Chargement de l&apos;examen blanc…
        </p>
        <SkeletonText lines={3} lastWidth="46%" lineHeight={14} gap={11} />
        <Skeleton h={112} />
        <SkeletonText lines={3} lastWidth="70%" lineHeight={12} gap={14} />
      </div>
    );
  } else if (load.kind === "failed") {
    body = (
      <div className="mkx-window-wait">
        <p className="mkx-error" role="alert">
          Impossible de charger l&apos;examen blanc pour l&apos;instant.
        </p>
      </div>
    );
    actions = (
      <>
        {close}
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => {
            setLoad({ kind: "loading" });
            setAttempt((n) => n + 1);
          }}
        >
          Réessayer
        </button>
      </>
    );
  } else {
    const { overview } = load;
    body = <MockExamIntro overview={overview} />;
    if (overview.ready) {
      actions = (
        <>
          {close}
          <button
            type="button"
            className="btn btn--accent btn--sm"
            disabled={pending}
            onClick={() => {
              start(() => {
                // In place of the window's step of the history: Back from the
                // exam returns to the path.
                router.replace(mockExamStartHref(overview.pathSlug));
              });
            }}
          >
            {overview.running !== null ? "Reprendre l'examen en cours" : "Commencer l'examen blanc"}{" "}
            <span aria-hidden="true">→</span>
          </button>
        </>
      );
    }
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      eyebrow="Examen blanc"
      title={load.kind === "ready" ? load.overview.pathTitle : pathTitle}
      maxWidth={1040}
      dismissable={!pending}
      actions={actions}
      className="mkx"
    >
      {body}
    </ModalShell>
  );
}
