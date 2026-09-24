"use client";

// Client: the buttons call the action one lesson at a time and show progress.
// Updating everything in one request would run the full lesson check ~190
// times inside a single function call, past any sensible timeout.

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLessonFromRepositoryAction, type SyncActionResult } from "../actions";

export interface SyncTarget {
  refCode: string;
  hash: string;
  title: string;
}

interface Failure {
  refCode: string;
  title: string;
  message: string;
  details: string[];
}

async function run(target: SyncTarget): Promise<SyncActionResult> {
  try {
    return await updateLessonFromRepositoryAction({ refCode: target.refCode, hash: target.hash });
  } catch {
    return { ok: false, message: "La requête a échoué. Réessaie.", details: [] };
  }
}

function Failures({ failures }: { failures: Failure[] }): React.ReactElement | null {
  if (failures.length === 0) return null;
  return (
    <ul className="a-sync-failures" role="alert">
      {failures.map((f) => (
        <li key={f.refCode}>
          <b>{f.refCode}</b> {f.title} : {f.message}
          {f.details.length > 0 ? (
            <ul>
              {f.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function UpdateOneButton({ target }: { target: SyncTarget }): React.ReactElement {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [failure, setFailure] = useState<Failure | null>(null);

  const onClick = async (): Promise<void> => {
    setState("running");
    setFailure(null);
    const result = await run(target);
    if (result.ok) {
      setState("done");
      router.refresh();
    } else {
      setState("idle");
      setFailure({ ...target, message: result.message, details: result.details });
    }
  };

  return (
    <div>
      <button
        type="button"
        className="a-btn a-btn--primary a-btn--sm"
        disabled={state !== "idle"}
        onClick={() => void onClick()}
      >
        {state === "running"
          ? "Mise à jour…"
          : state === "done"
            ? "Mise à jour faite"
            : "Mettre à jour"}
      </button>
      <Failures failures={failure ? [failure] : []} />
    </div>
  );
}

export function UpdateAllButton({ targets }: { targets: SyncTarget[] }): React.ReactElement {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "running" | "done">("idle");
  const [done, setDone] = useState(0);
  const [failures, setFailures] = useState<Failure[]>([]);

  const start = async (): Promise<void> => {
    setStep("running");
    setDone(0);
    setFailures([]);
    for (const target of targets) {
      const result = await run(target);
      if (!result.ok) {
        const failure = { ...target, message: result.message, details: result.details };
        setFailures((prev) => [...prev, failure]);
      }
      setDone((n) => n + 1);
    }
    setStep("done");
    router.refresh();
  };

  const count = String(targets.length);
  return (
    <div className="a-sync-all">
      {step === "idle" ? (
        <button
          type="button"
          className="a-btn a-btn--primary"
          onClick={() => {
            setStep("confirm");
          }}
        >
          Tout mettre à jour ({count})
        </button>
      ) : null}
      {step === "confirm" ? (
        <div className="a-sync-confirm">
          <p>
            {count} leçon{targets.length > 1 ? "s seront réécrites" : " sera réécrite"} avec le
            contenu du dépôt. Les modifications faites dans l&apos;éditeur sur ces leçons seront
            remplacées.
          </p>
          <div className="a-head-actions">
            <button type="button" className="a-btn a-btn--primary" onClick={() => void start()}>
              Confirmer
            </button>
            <button
              type="button"
              className="a-btn a-btn--ghost"
              onClick={() => {
                setStep("idle");
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}
      {step === "running" || step === "done" ? (
        <div className="a-sync-progress" aria-live="polite">
          <div className="a-meter-track">
            <div
              className="a-meter-fill"
              style={{
                width: `${String(Math.round((done / Math.max(1, targets.length)) * 100))}%`,
              }}
            />
          </div>
          <p>
            {step === "running" ? "Mise à jour" : "Terminé"} : {done} / {count}
            {failures.length > 0 ? `, ${String(failures.length)} refusée(s)` : ""}
          </p>
        </div>
      ) : null}
      <Failures failures={failures} />
    </div>
  );
}
