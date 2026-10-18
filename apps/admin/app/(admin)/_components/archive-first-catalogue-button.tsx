"use client";

// Client: a two-step confirmation, then one request and a refresh.

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { archiveFirstCatalogueAction } from "../_actions/catalogue-actions";

/** What the archiving did, for its toast: "12 parcours et 40 leçons archivés." */
function archivedNotice(paths: number, lessons: number): string {
  return `${String(paths)} parcours et ${String(lessons)} leçon${lessons > 1 ? "s" : ""} archivés.`;
}

/** Archives the first catalogue's paths and lessons, after a confirmation. */
export function ArchiveFirstCatalogueButton({
  paths,
  lessons,
}: {
  paths: number;
  lessons: number;
}): React.ReactElement | null {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "running">("idle");

  if (paths === 0 && lessons === 0) return null;

  // The button goes once there is nothing left to archive, so what it did is
  // said in a toast, which outlives it. A failure leaves it in place to retry.
  const start = async (): Promise<void> => {
    setStep("running");
    try {
      const archived = await archiveFirstCatalogueAction();
      setStep("idle");
      toast.success(archivedNotice(archived.paths, archived.lessons));
      router.refresh();
    } catch {
      setStep("idle");
      toast.error("L'archivage a échoué. Réessaie.");
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
    <button
      type="button"
      className="a-btn a-btn--ghost"
      onClick={() => {
        setStep("confirm");
      }}
    >
      Archiver l&apos;ancien catalogue ({paths + lessons})
    </button>
  );
}
