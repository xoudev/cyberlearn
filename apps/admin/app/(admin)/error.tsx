"use client";

// An error boundary has to be a Client Component: React catches the render
// failure in the browser and hands it the error.

import React, { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { GhostLink, PageHeader } from "./_components/admin-ui";

/**
 * A console page that failed to render. Until now nothing under (admin) caught
 * it, and global-error replaced the whole document: the sidebar went with it,
 * and the way back was a link on a bare page. This keeps the console around
 * the failed page and offers to load it again. The incident still goes to
 * Sentry; the digest is what matches it in the server logs.
 */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}): React.ReactElement {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="a-page">
      <PageHeader
        crumbs={[{ label: "Erreur" }]}
        title="Cette page n'a pas pu se charger"
        description="L'incident a été signalé automatiquement à l'équipe. Tu peux réessayer, l'action est sans risque."
        actions={
          <>
            <button type="button" className="a-btn a-btn--primary" onClick={retry}>
              Réessayer
            </button>
            <GhostLink href="/dashboard">Retour à l&apos;aperçu</GhostLink>
          </>
        }
      />
      {error.digest ? <p className="a-field-hint">Référence : {error.digest}</p> : null}
    </main>
  );
}
