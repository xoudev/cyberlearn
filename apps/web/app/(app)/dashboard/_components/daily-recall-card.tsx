import React from "react";
import { CARD_SESSION_SIZE, REVIEW_SESSION_XP } from "@cyberlearn/lib/revisions/cards";
import { RappelButton } from "@/components/rappel/rappel-button";
import type { DailyRecallState } from "@/lib/revisions/daily-recall";

const STATE_LABEL: Record<DailyRecallState, string> = {
  todo: "à faire",
  done: "fait aujourd'hui",
  empty: "rien aujourd'hui",
};

/**
 * The day's recall on the dashboard: to do, done, or nothing to ask, and the
 * button that opens it in its window (?rappel=1). It never says how many
 * questions wait: a number that only grows while one is away is a reason not
 * to come back. The section keeps its shape from one day to the next.
 */
export function DailyRecallCard({ state }: { state: DailyRecallState }): React.JSX.Element {
  return (
    <section className="dash-sec" aria-labelledby="dash-rev-title">
      <div className="dash-sec-head">
        <h2 id="dash-rev-title">Rappel du jour</h2>
        <span className="dash-sec-count">{STATE_LABEL[state]}</span>
      </div>

      <div className="dash-recall" data-state={state}>
        <p className="dash-recall-text">
          {state === "todo" &&
            `Quelques questions de tes leçons, ${String(CARD_SESSION_SIZE)} au plus, corrigées une à une : deux minutes et ${String(REVIEW_SESSION_XP)} XP.`}
          {state === "done" &&
            "Fait pour aujourd'hui. Les questions ratées reviennent demain, les autres plus tard."}
          {state === "empty" &&
            "Rien à revoir aujourd'hui. Une question ratée dans une leçon revient ici le lendemain."}
        </p>
        {state !== "empty" && (
          <RappelButton className={`btn btn--sm${state === "done" ? " btn--ghost" : ""}`}>
            {state === "done" ? "Revoir mes réponses" : "Commencer"}
          </RappelButton>
        )}
      </div>
      <p className="dash-rev-note">
        Une question revient d&apos;autant plus tard que tu y réponds juste : deux minutes
        aujourd&apos;hui valent vingt dans un mois.
      </p>
    </section>
  );
}
