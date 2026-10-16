import React from "react";
import type { Metadata } from "next";
import { PageHeader, PrimaryLink } from "./_components/admin-ui";

export const metadata: Metadata = { title: "Introuvable" };

/**
 * What a console page's notFound() shows: a user, a ticket or a lesson that is
 * not there, or an id that cannot be one (lib/route-id.ts). It renders inside
 * the (admin) layout, sidebar and all, which has already checked the caller.
 * Without it, Next's own page answered, in English and with no way back.
 */
export default function AdminNotFound(): React.ReactElement {
  return (
    <main className="a-page">
      <PageHeader
        crumbs={[{ label: "Erreur 404" }]}
        title="Introuvable"
        description="Rien ne correspond à cette adresse dans la console. L'élément a peut-être été supprimé, ou le lien est incomplet."
        actions={<PrimaryLink href="/dashboard">Retour à l&apos;aperçu</PrimaryLink>}
      />
    </main>
  );
}
