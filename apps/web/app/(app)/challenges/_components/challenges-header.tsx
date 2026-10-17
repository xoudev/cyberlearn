import React from "react";
import Link from "next/link";
import {
  CHALLENGES_TABS,
  challengesTabHref,
  type ChallengesTab,
} from "@cyberlearn/lib/challenges/tabs";
import { Crumb } from "@/components/crumb";

const LABELS: Record<ChallengesTab, string> = {
  defis: "Défis",
  tournois: "Tournois",
};

/**
 * The top of the challenges section, above either tab: the breadcrumb, the
 * title, and the two tabs, the catalogue and the tournaments.
 *
 * The tabs are links, drawn on the tab row's classes: each tab is read on the
 * server (the tournaments only for theirs), and its address names it
 * (`/challenges?tab=tournois`).
 */
export function ChallengesHeader({ tab }: { tab: ChallengesTab }): React.ReactElement {
  return (
    <>
      <Crumb
        segments={
          tab === "tournois"
            ? [{ label: "défis", href: challengesTabHref("defis") }, "tournois"]
            : ["défis"]
        }
      />
      <h1 className="pg-title">Défis</h1>
      <nav className="tabs dfx-tabs" aria-label="Sections des défis">
        {CHALLENGES_TABS.map((key) => (
          <Link
            key={key}
            href={challengesTabHref(key)}
            className="tabs__tab"
            data-active={key === tab}
            aria-current={key === tab ? "page" : undefined}
          >
            {LABELS[key]}
          </Link>
        ))}
      </nav>
    </>
  );
}
