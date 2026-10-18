import React from "react";
import {
  RECALL_NOTE,
  RECALL_STATE_ACTION,
  RECALL_STATE_LABEL,
  RECALL_STATE_TEXT,
} from "@cyberlearn/lib/revisions/recall-copy";
import { RappelButton } from "@/components/rappel/rappel-button";
import type { DailyRecallState } from "@/lib/revisions/daily-recall";

/**
 * The day's recall on the dashboard: to do, done, or nothing to ask, and the
 * button that opens it in its window (?rappel=1). It never says how many
 * questions wait: a number that only grows while one is away is a reason not
 * to come back. The section keeps its shape from one day to the next. The
 * app's home tab says the same words (@cyberlearn/lib/revisions/recall-copy).
 */
export function DailyRecallCard({ state }: { state: DailyRecallState }): React.JSX.Element {
  const action = RECALL_STATE_ACTION[state];
  return (
    <section className="dash-sec" aria-labelledby="dash-rev-title">
      <div className="dash-sec-head">
        <h2 id="dash-rev-title">Rappel du jour</h2>
        <span className="dash-sec-count">{RECALL_STATE_LABEL[state]}</span>
      </div>

      <div className="dash-recall" data-state={state}>
        <p className="dash-recall-text">{RECALL_STATE_TEXT[state]}</p>
        {action !== null && (
          <RappelButton className={`btn btn--sm${state === "done" ? " btn--ghost" : ""}`}>
            {action}
          </RappelButton>
        )}
      </div>
      <p className="dash-rev-note">{RECALL_NOTE}</p>
    </section>
  );
}
