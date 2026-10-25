"use client";

// Retry is supplied by the active error boundary; this panel only presents and calls it.
import React from "react";
import Link from "next/link";
import { StandaloneFrame } from "./standalone-frame";

export function ErrorPanel({
  scope,
  digest,
  onRetry,
}: {
  scope: "site" | "app" | "global";
  digest?: string | undefined;
  onRetry: () => void;
}): React.ReactElement {
  const title =
    scope === "site"
      ? "Cette page n’a pas pu se charger."
      : scope === "app"
        ? "Cette section n’a pas pu se charger"
        : "Erreur inattendue";
  return (
    <StandaloneFrame embedded={scope === "app"}>
      <p className="state-code">
        {scope === "global" ? "Erreur inattendue" : "Chargement interrompu"}
      </p>
      <h1 id="standalone-title" className="state-title">
        {title}
      </h1>
      <p className="state-description">
        {scope === "global"
          ? "Une erreur critique s’est produite. L’incident a été signalé automatiquement."
          : "Une erreur est survenue de notre côté. L’incident a été signalé ; tu peux réessayer."}
      </p>
      {digest ? <p className="state-digest">ID : {digest}</p> : null}
      <div className="state-actions">
        <button type="button" className="state-primary" onClick={onRetry}>
          Réessayer
        </button>
        <Link href={scope === "app" ? "/dashboard" : "/"} className="state-secondary">
          {scope === "app" ? "Tableau de bord" : "Retour à l’accueil"}
        </Link>
        <Link
          href={`/contact${digest ? `?ref=${encodeURIComponent(digest)}` : ""}`}
          className="state-secondary"
        >
          Signaler le problème
        </Link>
      </div>
    </StandaloneFrame>
  );
}
