import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireRequestUser } from "@/lib/auth";
import { readGuideQuery, savedLearningAnswers, suggestionsFor } from "@/lib/paths/suggestions";
import { GuideQuestions } from "@/app/_components/path-guide/guide-questions";
import { GuideSuggestions } from "@/app/_components/path-guide/guide-suggestions";
import { AnswerRecap } from "@/app/_components/path-guide/guide-answers";
import "../_components/paths-catalog-v2.css";

export const metadata: Metadata = { title: "Trouver mon parcours" };

const ACTION = "/paths/guide";

/**
 * The onboarding's questionnaire, open at any time from the catalogue. It
 * only reads: the answers stay in the address, and nothing is recorded.
 */
export default async function PathGuidePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();
  const view = readGuideQuery(await searchParams, await savedLearningAnswers(authUser.id));
  const suggestions = view.answers === null ? [] : await suggestionsFor(view.answers);

  return (
    <div className="pc2-root">
      <div className="pc2">
        <div className="pc2-crumb">
          <span className="p">$</span>
          <span>~/</span>
          <b>cyberlearn</b>
          <span className="slash">/</span>
          <Link href="/paths" style={{ color: "inherit", textDecoration: "none" }}>
            parcours
          </Link>
          <span className="slash">/</span>
          <span className="current">guide</span>
          <span className="caret" />
        </div>

        <div style={{ marginBottom: 28 }}>
          <h1 className="pc2-title">
            Trouver <em>ton parcours</em>
          </h1>
          <p className="pc2-sub">
            Deux questions, et deux ou trois parcours pour commencer, chacun avec sa raison. Ce sont
            des suggestions : rien n&apos;est enregistré ni imposé.
          </p>
        </div>

        <section className="pg-panel">
          {view.answers === null ? (
            <GuideQuestions
              action={ACTION}
              answers={view.draft}
              error={view.error}
              submitLabel="Voir mes suggestions"
            />
          ) : (
            <>
              <AnswerRecap answers={view.answers} action={ACTION} />
              <GuideSuggestions
                suggestions={suggestions}
                cta={(path, i) => (
                  <Link
                    href={`/paths/${path.slug}`}
                    className={
                      i === 0
                        ? "pg-btn pg-btn--small btn-blue"
                        : "pg-btn pg-btn--small pg-btn--ghost"
                    }
                  >
                    Voir ce parcours <span aria-hidden="true">→</span>
                  </Link>
                )}
              />
            </>
          )}
        </section>

        <Link href="/paths" className="pg-back">
          ← Tout le catalogue
        </Link>
      </div>
    </div>
  );
}
