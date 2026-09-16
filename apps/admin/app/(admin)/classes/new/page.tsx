import React from "react";
import type { Metadata } from "next";
import { classRepository } from "@cyberlearn/db";
import { GhostLink, PageHeader } from "../../_components/admin-ui";
import { ComposeForms } from "./_components/compose-forms";

export const metadata: Metadata = { title: "Créer" };
export const dynamic = "force-dynamic";

/**
 * Creation, off the list.
 *
 * The three forms used to sit at the top of /classes behind a "+ Créer" toggle,
 * pushing the list they were meant to fill down the page. Setting a school up
 * is something you do once; finding a class is something you do every day, and
 * the two do not belong on the same screen competing for it.
 *
 * The three stay together, though, and on one route: establishment, intake and
 * class are one sitting, and a wizard spread over three pages would turn that
 * into a navigation exercise. Each form states what it needs from the one above
 * rather than silently refusing.
 */
export default async function NewClassPage(): Promise<React.ReactElement> {
  const hierarchy = await classRepository.listHierarchy();

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Structure"
        title="Créer"
        description="Un établissement contient des promos, une promo contient des classes. Crée-les dans cet ordre - chaque niveau a besoin du précédent."
        actions={<GhostLink href="/classes">Retour aux classes</GhostLink>}
      />

      <ComposeForms
        establishments={hierarchy.map((e) => ({
          id: e.id,
          name: e.name,
          promotions: e.promotions.map((p) => ({ id: p.id, name: p.name })),
        }))}
      />
    </main>
  );
}
