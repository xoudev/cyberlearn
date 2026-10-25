import React from "react";
import Link from "next/link";
import { prisma } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { skipOnboarding } from "../_actions/finalize-onboarding";
import { PlacementShell } from "../_components/onboarding-shell";

export default async function PlacementTestIntroPage(): Promise<React.ReactElement> {
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

  // If already submitted, finalize and go to dashboard
  const existing = await prisma.userPlacementResult.findUnique({ where: { userId: user.id } });
  if (existing) redirect("/dashboard");

  const questionCount = await prisma.placementQuestion.count({ where: { isActive: true } });
  const estimatedMinutes = Math.ceil(questionCount * 0.75);

  return (
    <PlacementShell>
      <p className="ob-kicker">Test optionnel</p>
      <h1 className="ob-shell__title">Partir de ce que tu sais.</h1>
      <p className="ob-shell__lede">
        Un court test pour repérer tes acquis et te proposer où commencer. Tu peux aussi explorer
        librement.
      </p>
      <dl className="ob-facts">
        <div>
          <dt>Questions</dt>
          <dd>{questionCount}</dd>
        </div>
        <div>
          <dt>Durée estimée</dt>
          <dd>
            {estimatedMinutes} <small>min</small>
          </dd>
        </div>
      </dl>
      <p className="ob-note">
        Aucun XP n’est attribué. Ces réponses servent à personnaliser les parcours ; aucune note
        n’est affichée sur ton profil.
      </p>
      <div className="ob-shell__actions">
        {questionCount > 0 ? (
          <Link className="btn btn--lg btn--block" href="/onboarding/placement-test/questions">
            Commencer le test
          </Link>
        ) : (
          <p className="ob-note" role="status">
            Le test n’est pas encore disponible.
          </p>
        )}
        <form action={skipOnboarding}>
          <button className="btn btn--ghost btn--lg btn--block" type="submit">
            Passer et ouvrir le tableau de bord
          </button>
        </form>
        <Link className="ob-shell__link" href="/onboarding/goals">
          Retour aux suggestions
        </Link>
      </div>
    </PlacementShell>
  );
}
