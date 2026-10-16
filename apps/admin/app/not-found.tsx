import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminAuthShell } from "./(auth)/auth-shell";

export const metadata: Metadata = { title: "Page introuvable" };

/**
 * An address no console route answers. No route means no (admin) layout to
 * draw the sidebar, and no check of the caller either - a missing image skips
 * the middleware - so the page stands alone, like the sign-in screens, shows
 * nothing it would have to check for, and leads back to the overview, whose
 * own checks apply. A notFound() inside the console has its page within the layout:
 * app/(admin)/not-found.tsx. Without either, Next's own 404 answered, in
 * English and with no way back.
 */
export default function NotFound(): React.ReactElement {
  return (
    <AdminAuthShell
      eyebrow="Erreur 404"
      title="Page introuvable"
      description="Aucune page de la console ne correspond à cette adresse. Elle est peut-être mal saisie, ou la page a changé de place."
    >
      <div className="a-auth-form">
        <Link className="a-btn a-btn--primary" href="/dashboard">
          Retour à l&apos;aperçu
        </Link>
      </div>
    </AdminAuthShell>
  );
}
