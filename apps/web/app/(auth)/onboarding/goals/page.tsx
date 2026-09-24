import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { readGuideQuery, savedLearningAnswers, suggestionsFor } from "@/lib/paths/suggestions";
import { GuideQuestions } from "@/app/_components/path-guide/guide-questions";
import { GuideSuggestions } from "@/app/_components/path-guide/guide-suggestions";
import { AnswerFields, AnswerRecap } from "@/app/_components/path-guide/guide-answers";
import { OnboardingShell } from "../_components/onboarding-shell";
import { skipOnboarding } from "../_actions/finalize-onboarding";
import { finishGoals } from "./_actions/finish-goals";

export const metadata: Metadata = { title: "Ton objectif" };

const ACTION = "/onboarding/goals";

/**
 * Step 3: what brings you here, then two or three paths to start with.
 *
 * It replaced the placement test as the last step. Somebody who knows nothing
 * could only fail that test, and still did not know which of sixteen paths to
 * open. The test is offered here to those who say they already have a base.
 */
export default async function OnboardingGoalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { username: true },
  });
  if (!dbUser?.username) redirect("/onboarding");

  const view = readGuideQuery(await searchParams, await savedLearningAnswers(user.id));

  if (view.answers === null) {
    return (
      <OnboardingShell
        step={3}
        stepName="Objectif"
        panelTitle="Trouver ton parcours"
        panelTag="03/03"
      >
        <h1 className="ob-shell__title">
          Qu&apos;est-ce que tu veux <em>apprendre ?</em>
        </h1>
        <p className="ob-shell__lede">
          Deux questions pour te proposer par où commencer. Ce sont des suggestions : tout le
          catalogue reste ouvert, et tu pourras changer d&apos;avis.
        </p>
        <GuideQuestions
          action={ACTION}
          answers={view.draft}
          error={view.error}
          submitLabel="Voir mes suggestions"
        />
        <div className="ob-shell__actions" style={{ marginTop: 12 }}>
          <form action={skipOnboarding}>
            <button type="submit" className="pg-btn pg-btn--ghost">
              Passer, j&apos;explore seul
            </button>
          </form>
          <Link href="/onboarding/avatar" className="ob-shell__link">
            ← Retour
          </Link>
        </div>
      </OnboardingShell>
    );
  }

  const answers = view.answers;
  const suggestions = await suggestionsFor(answers);

  return (
    <OnboardingShell step={3} stepName="Objectif" panelTitle="Tes suggestions" panelTag="03/03">
      <h1 className="ob-shell__title">
        Par ici pour <em>commencer.</em>
      </h1>
      <AnswerRecap answers={answers} action={ACTION} />
      <GuideSuggestions
        suggestions={suggestions}
        cta={(path, i) => (
          <form action={finishGoals}>
            <AnswerFields answers={answers} />
            <input type="hidden" name="to" value="path" />
            <input type="hidden" name="slug" value={path.slug} />
            <button
              type="submit"
              className={
                i === 0 ? "pg-btn pg-btn--small btn-blue" : "pg-btn pg-btn--small pg-btn--ghost"
              }
            >
              Commencer ce parcours <span aria-hidden="true">→</span>
            </button>
          </form>
        )}
      />
      <div className="ob-shell__actions">
        {answers.level !== "NEW" && (
          <form action={finishGoals}>
            <AnswerFields answers={answers} />
            <input type="hidden" name="to" value="placement" />
            <button type="submit" className="pg-btn pg-btn--ghost">
              Faire le test de positionnement
            </button>
            <p className="pg-note" style={{ margin: "8px 0 0" }}>
              Optionnel. Il repère ce que tu maîtrises déjà, pour que tu puisses sauter ces leçons.
            </p>
          </form>
        )}
        <form action={finishGoals}>
          <AnswerFields answers={answers} />
          <input type="hidden" name="to" value="catalogue" />
          <button type="submit" className="pg-btn pg-btn--ghost">
            Voir tout le catalogue
          </button>
        </form>
      </div>
    </OnboardingShell>
  );
}
