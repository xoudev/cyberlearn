import React from "react";
import Link from "next/link";
import { placementRepository, userRepository } from "@cyberlearn/db";
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

  const dbUser = await userRepository.findOnboardingProfile(user.id);

  if (!dbUser?.username) redirect("/onboarding");

  // The test is taken once. With the sign-up finished there is nothing left
  // here. A result without the flag is a submission that stopped between its
  // two steps (it stores the result, then ends the sign-up): the dashboard
  // would send that account back to step 2, so the page stays, with the one
  // button that ends the sign-up.
  const taken = await placementRepository.hasResult(user.id);
  if (taken && user.app_metadata.onboarding_complete === true) redirect("/dashboard");

  const questionCount = await placementRepository.countActiveQuestions();
  const estimatedMinutes = Math.ceil(questionCount * 0.75);

  return (
    <PlacementShell>
      <p className="ob-kicker">Test optionnel</p>
      <h1 className="ob-shell__title">Partir de ce que tu sais.</h1>
      <p className="ob-shell__lede">
        Un court test pour repérer tes acquis et te proposer où commencer. Tu peux aussi explorer
        librement.
      </p>
      {taken ? (
        <p className="ob-note">
          Ton test est déjà enregistré. Termine ton inscription pour accéder au tableau de bord.
        </p>
      ) : (
        <dl className="ob-facts">
          <div>
            <dt>Questions</dt>
            <dd>{questionCount}</dd>
          </div>
          <div>
            <dt>Durée estimée</dt>
            <dd>
              <span>{estimatedMinutes}</span> <small>min</small>
            </dd>
          </div>
        </dl>
      )}
      <p className="ob-note">
        Aucun XP n’est attribué. Ces réponses servent à personnaliser les parcours ; aucune note
        n’est affichée sur ton profil.
      </p>
      <div className="ob-shell__actions">
        {!taken && questionCount > 0 ? (
          <Link className="btn btn--lg btn--block" href="/onboarding/placement-test/questions">
            Commencer le test
          </Link>
        ) : !taken ? (
          <p className="ob-note" role="status">
            Le test n’est pas encore disponible.
          </p>
        ) : null}
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
