"use client";

import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import { claimCertificateAction } from "../_actions/generate-certificate";

/**
 * Client island for the "claim certificate" action, used inside the (server)
 * final-boss node of the Path Detail v2 page when a path has NO active quiz and
 * every lesson is complete. Keeps the boss panel a Server Component — only this
 * button is client. Wiring to claimCertificateAction is unchanged.
 */
export function ClaimCertificateButton({ pathSlug }: { pathSlug: string }): React.JSX.Element {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function claim(): void {
    setError(null);
    start(async () => {
      const res = await claimCertificateAction(pathSlug);
      if (!res.ok) {
        setError(res.error ?? "Échec.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        className="cp-boss__cta cp-boss__cta--teal"
        onClick={claim}
        disabled={pending}
      >
        {pending ? "Émission…" : "Obtenir mon certificat →"}
      </button>
      {error && <p className="cp-boss__err">{error}</p>}
    </>
  );
}
