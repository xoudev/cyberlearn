"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";

/**
 * Where the queue says what a decision came to, above the rows.
 *
 * Not in the row: a decided event leaves the queue in the same response that
 * carries its result, so a warning held by the row's buttons was unmounted
 * before anyone could read it - a sanction that did not apply, a ban whose
 * e-mail did not leave, a row somebody else had already decided. This sits
 * above the rows, stays mounted while they come and go, and keeps the last
 * few messages, each naming the content it is about.
 *
 * "use client": it holds the messages between two readings of the queue.
 */

interface Outcome {
  id: number;
  /** Which content, since its row is gone by the time this is read. */
  about: string;
  text: string;
}

type Report = (about: string, text: string) => void;

const ReportContext = createContext<Report>(() => {
  // Outside a ReviewOutcomes nothing listens, which is only ever a test.
});

/** How a row's buttons hand over what to say. */
export function useReportOutcome(): Report {
  return useContext(ReportContext);
}

const KEPT = 5;

export function ReviewOutcomes({ children }: { children: React.ReactNode }): React.ReactElement {
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const lastId = useRef(0);
  const report = useCallback<Report>((about, text) => {
    lastId.current += 1;
    const id = lastId.current;
    setOutcomes((current) => [{ id, about, text }, ...current].slice(0, KEPT));
  }, []);

  return (
    <ReportContext.Provider value={report}>
      {outcomes.length > 0 && (
        <div role="status" style={{ display: "grid", gap: 8, marginBottom: 16 }}>
          {outcomes.map((outcome) => (
            <p key={outcome.id} className="a-form-error">
              <b>{outcome.about}</b> · {outcome.text}
            </p>
          ))}
        </div>
      )}
      {children}
    </ReportContext.Provider>
  );
}
