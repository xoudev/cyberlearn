"use client";

// Client: a two-step confirmation, then one request and a refresh.

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { archiveFirstCatalogueAction } from "../_actions/catalogue-actions";

/** Archives the first catalogue's paths and lessons, after a confirmation. */
export function ArchiveFirstCatalogueButton({
  paths,
  lessons,
}: {
  paths: number;
  lessons: number;
}): React.ReactElement | null {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "running" | "failed">("idle");

  if (paths === 0 && lessons === 0) return null;

  const start = async (): Promise<void> => {
    setStep("running");
    try {
      await archiveFirstCatalogueAction();
      setStep("idle");
      router.refresh();
    } catch {
      setStep("failed");
    }
  };

  if (step === "confirm" || step === "running") {
    return (
      <div className="a-sync-confirm">
        <p>
          {paths} parcours et {lessons} leçon{lessons > 1 ? "s" : ""} de l&apos;ancien catalogue
          quitteront le site et l&apos;app, et rejoindront les archives. Les progressions sont
          conservées, et tout peut être remis en brouillon depuis les archives.
        </p>
        <div className="a-head-actions">
          <button
            type="button"
            className="a-btn a-btn--primary"
            disabled={step === "running"}
            onClick={() => void start()}
          >
            {step === "running" ? "Archivage…" : "Confirmer l'archivage"}
          </button>
          <button
            type="button"
            className="a-btn a-btn--ghost"
            disabled={step === "running"}
            onClick={() => {
              setStep("idle");
            }}
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="a-btn a-btn--ghost"
        onClick={() => {
          setStep("confirm");
        }}
      >
        Archiver l&apos;ancien catalogue ({paths + lessons})
      </button>
      {step === "failed" ? (
        <span role="alert" className="a-sync-file">
          L&apos;archivage a échoué. Réessaie.
        </span>
      ) : null}
    </>
  );
}
