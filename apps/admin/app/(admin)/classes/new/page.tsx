import React from "react";
import type { Metadata } from "next";
import { classRepository } from "@cyberlearn/db";
import { GhostLink, PageHeader } from "../../_components/admin-ui";
import { NEW_CLASS_HEADER } from "../_components/class-columns";
import { ComposeForms } from "./_components/compose-forms";

import { requireAdminPage } from "@/lib/auth";

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
  await requireAdminPage();
  const hierarchy = await classRepository.listHierarchy();

  return (
    <main className="a-page">
      <PageHeader
        crumbs={NEW_CLASS_HEADER.crumbs}
        title={NEW_CLASS_HEADER.title}
        description={NEW_CLASS_HEADER.description}
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
