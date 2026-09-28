"use client";

// Client: the buttons call the action one item at a time and show progress.
// Doing everything in one request would run the full lesson check ~190 times
// inside a single function call, past any sensible timeout.

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  importLessonFromRepositoryAction,
  syncPathFromRepositoryAction,
  updateLessonFromRepositoryAction,
  type SyncActionResult,
} from "../actions";

/** What a button does: update a lesson, import a new one, or write a path. */
export type SyncKind = "update" | "import" | "path";

export interface SyncTarget {
  refCode: string;
  title: string;
  /** The fingerprint the admin saw, for an update only. */
  hash?: string;
}

interface Failure {
  refCode: string;
  title: string;
  message: string;
  details: string[];
}

const COPY: Record<
  SyncKind,
  {
    one: string;
    running: string;
    done: string;
    all: (count: string) => string;
    confirm: (count: number) => string;
    progress: string;
  }
> = {
  update: {
    one: "Mettre à jour",
    running: "Mise à jour…",
    done: "Mise à jour faite",
    all: (count) => `Tout mettre à jour (${count})`,
    confirm: (count) =>
      `${String(count)} leçon${count > 1 ? "s seront réécrites" : " sera réécrite"} avec le contenu du dépôt. Les modifications faites dans l'éditeur sur ces leçons seront remplacées.`,
    progress: "Mise à jour",
  },
  import: {
    one: "Importer",
    running: "Import…",
    done: "Importée",
    all: (count) => `Tout importer (${count})`,
    confirm: (count) =>
      `${String(count)} leçon${count > 1 ? "s seront importées" : " sera importée"} en brouillon, dans l'ordre de leurs prérequis. Tu les publieras depuis la liste des leçons.`,
    progress: "Import",
  },
  path: {
    one: "Synchroniser",
    running: "Synchronisation…",
    done: "Synchronisé",
    all: (count) => `Synchroniser les parcours (${count})`,
    confirm: (count) =>
      `${String(count)} parcours ${count > 1 ? "seront écrits" : "sera écrit"} depuis content/paths : titre, modules et ordre des leçons déjà importées. Un nouveau parcours arrive en brouillon ; un parcours existant garde son statut.`,
    progress: "Synchronisation",
  },
};

async function run(kind: SyncKind, target: SyncTarget): Promise<SyncActionResult> {
  try {
    if (kind === "update") {
      return await updateLessonFromRepositoryAction({
        refCode: target.refCode,
        hash: target.hash ?? "",
      });
    }
    if (kind === "import") {
      return await importLessonFromRepositoryAction({ refCode: target.refCode });
    }
    return await syncPathFromRepositoryAction({ refCode: target.refCode });
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

export function RunOneButton({
  kind,
  target,
}: {
  kind: SyncKind;
  target: SyncTarget;
}): React.ReactElement {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [failure, setFailure] = useState<Failure | null>(null);
  const copy = COPY[kind];

  const onClick = async (): Promise<void> => {
    setState("running");
    setFailure(null);
    const result = await run(kind, target);
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
        {state === "running" ? copy.running : state === "done" ? copy.done : copy.one}
      </button>
      <Failures failures={failure ? [failure] : []} />
    </div>
  );
}

/**
 * Runs every target in the order given, one request each. For an import that
 * order is the prerequisites' order, so a lesson follows the ones it needs.
 */
export function RunAllButton({
  kind,
  targets,
}: {
  kind: SyncKind;
  targets: SyncTarget[];
}): React.ReactElement {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "running" | "done">("idle");
  const [done, setDone] = useState(0);
  const [failures, setFailures] = useState<Failure[]>([]);
  const copy = COPY[kind];

  const start = async (): Promise<void> => {
    setStep("running");
    setDone(0);
    setFailures([]);
    for (const target of targets) {
      const result = await run(kind, target);
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
          {copy.all(count)}
        </button>
      ) : null}
      {step === "confirm" ? (
        <div className="a-sync-confirm">
          <p>{copy.confirm(targets.length)}</p>
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
            {step === "running" ? copy.progress : "Terminé"} : {done} / {count}
            {failures.length > 0 ? `, ${String(failures.length)} refusé(s)` : ""}
          </p>
        </div>
      ) : null}
      <Failures failures={failures} />
    </div>
  );
}
