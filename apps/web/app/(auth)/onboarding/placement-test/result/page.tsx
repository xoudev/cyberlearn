import React from "react";
import Link from "next/link";
import { z } from "zod";
import {
  PLACEMENT_CATEGORIES,
  PLACEMENT_CATEGORY_LABEL,
  PLACEMENT_COPY,
  masteredPlacementDomains,
  placementLevelFor,
  placementStartCopy,
  placementScoreOf,
  strongestPlacementDomain,
} from "@cyberlearn/lib/onboarding/placement";
import { ProgressBar } from "@/components/progress-bar";
import { PlacementShell } from "../../_components/onboarding-shell";

interface ResultPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const scoreSchema = z.string().transform(Number).pipe(z.number());
const pathSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

function readScore(value: unknown): number {
  const parsed = scoreSchema.safeParse(value);
  return parsed.success ? Math.min(100, Math.max(0, parsed.data)) : 0;
}

export default async function PlacementResultPage({
  searchParams,
}: ResultPageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  // Query values only describe the result screen; scoring and waivers stay in the service.
  const scores = {
    devScore: readScore(params.dev),
    cybersecScore: readScore(params.cybersec),
    networkScore: readScore(params.network),
  };
  const path = pathSchema.safeParse(params.path);
  const bestDomain = strongestPlacementDomain(scores);
  const waivedSomething = masteredPlacementDomains(scores).length > 0;
  const startCopy = placementStartCopy(scores);

  return (
    <PlacementShell>
      <h1 className="ob-shell__title">Ton profil, cartographié.</h1>
      <p className="ob-shell__lede">
        Voici ton point de départ dans les trois domaines. Le catalogue reste ouvert pour la suite.
      </p>
      <section className="ob-scores" aria-labelledby="placement-scores">
        <div className="ob-scores__head">
          <h2 id="placement-scores">Scores par domaine</h2>
          <p>
            Point fort · <b>{PLACEMENT_CATEGORY_LABEL[bestDomain]}</b>
          </p>
        </div>
        {PLACEMENT_CATEGORIES.map((category) => {
          const score = placementScoreOf(scores, category);
          return (
            <div className="ob-score" key={category}>
              <div>
                <h3>{PLACEMENT_CATEGORY_LABEL[category]}</h3>
                <p>{placementLevelFor(score)}</p>
              </div>
              <strong>{score}%</strong>
              <ProgressBar
                value={score}
                label={`Score en ${PLACEMENT_CATEGORY_LABEL[category]}`}
                color="#923200"
              />
            </div>
          );
        })}
        {waivedSomething && <p className="ob-scores__note">{PLACEMENT_COPY.waived}</p>}
      </section>
      {path.success ? (
        <section className="ob-recommendation" aria-labelledby="recommended-path">
          <h2 id="recommended-path">Ton parcours recommandé</h2>
          <p>{PLACEMENT_COPY.recommended}</p>
          <Link href={`/paths/${path.data}`} className="btn">
            Voir le parcours
          </Link>
        </section>
      ) : (
        startCopy !== null && <p className="ob-note">{startCopy}</p>
      )}
      <div className="ob-form__actions">
        <Link href="/dashboard" className="btn btn--lg">
          Accéder au tableau de bord
        </Link>
        <Link href="/lessons" className="ob-shell__link">
          Explorer les leçons
        </Link>
      </div>
    </PlacementShell>
  );
}
