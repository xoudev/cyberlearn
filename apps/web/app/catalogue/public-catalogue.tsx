"use client";

import { useMemo, useState } from "react";
import type { PublicCatalogPath } from "@cyberlearn/db";
import { PathCatalogCard } from "@/app/_components/path-catalog-card";
import "@/app/(app)/paths/_components/paths-catalog-v2.css";
import { EmptyState } from "@/components/empty-state";
import { brandTypeface } from "@/components/brand-typeface";

type Category = "ALL" | "CYBERSEC" | "DEV" | "NETWORK";

/**
 * The catalogue's content. The frame around it, the app's shell or the public
 * navbar, is the layout's.
 */
export function PublicCatalogue({
  paths,
  member,
}: {
  /** Each with its cover resolved on the server (lib/paths/cover.ts). */
  paths: (PublicCatalogPath & { coverSrc: string })[];
  /**
   * Read by somebody signed in, whom the layout draws in the app: a card
   * opens its path, and the words for a visitor about to sign up go.
   */
  member: boolean;
}): React.JSX.Element {
  const [category, setCategory] = useState<Category>("ALL");
  const [search, setSearch] = useState("");
  const visiblePaths = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return paths.filter((path) => {
      const categoryMatches = category === "ALL" || path.category === category;
      const searchMatches =
        query.length === 0 ||
        path.title.toLocaleLowerCase("fr").includes(query) ||
        path.description.toLocaleLowerCase("fr").includes(query);
      return categoryMatches && searchMatches;
    });
  }, [category, paths, search]);

  return (
    <div className={`public-catalogue__main learning-catalogue ${brandTypeface}`}>
      <section className="catalogue-heading" aria-labelledby="catalogue-title">
        <div>
          <p className="catalogue-heading__index">
            {member ? "Apprendre / Parcours" : "Le catalogue Bastion"}
          </p>
          <h1 id="catalogue-title">
            Un cap.
            <br />
            <em>Des compétences.</em>
          </h1>
          <p className="catalogue-heading__description">
            {member
              ? "Explore les compétences, le niveau et le contenu de chaque parcours, puis ouvre celui qui te tente."
              : "Explore les compétences, le niveau et le contenu avant de créer ton compte. Ton premier parcours commencera après l’inscription."}
          </p>
        </div>
        <aside className="catalogue-summary">
          <div className="catalogue-summary__count">
            <strong>{String(paths.length).padStart(2, "0")}</strong>
            <span>parcours au catalogue</span>
          </div>
          <p className="catalogue-summary__stats">
            {new Set(paths.map((path) => path.category)).size} domaines à travailler
          </p>
          <p className="catalogue-summary__note">
            {member
              ? "Ouvre un parcours pour retrouver ses missions."
              : "Crée ton compte pour commencer un parcours et suivre ta progression."}
          </p>
        </aside>
      </section>

      <section
        className="public-catalogue__filters catalogue-tools"
        aria-label="Filtrer les parcours"
      >
        <div className="public-catalogue__pills">
          {(
            [
              ["ALL", "Tous"],
              ["CYBERSEC", "Cybersec"],
              ["DEV", "Dev"],
              ["NETWORK", "Réseau"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="catalogue-domain"
              aria-pressed={category === value}
              onClick={() => {
                setCategory(value);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="catalogue-search">
          <input
            type="search"
            aria-label="Rechercher un parcours"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder="Nom ou compétence…"
          />
        </label>
      </section>

      <p className="public-catalogue__result-count" aria-live="polite">
        {visiblePaths.length} parcours affiché{visiblePaths.length > 1 ? "s" : ""}
      </p>

      {visiblePaths.length > 0 ? (
        <section className="public-catalogue__paths pc2-root" aria-label="Parcours disponibles">
          <div className="pc2-discover">
            {visiblePaths.map((path) => (
              <PathCatalogCard
                key={path.slug}
                id={path.slug}
                href={member ? `/paths/${path.slug}` : "/register"}
                path={{
                  ...path,
                  lessonCount: path.lessons,
                  xpTotal: path.xp,
                  hasCert: path.hasCertificate,
                }}
              />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState title="Aucun parcours trouvé" message="Modifie les filtres ou ta recherche.">
          <button
            type="button"
            className="catalogue-domain"
            onClick={() => {
              setCategory("ALL");
              setSearch("");
            }}
          >
            Voir tous les parcours
          </button>
        </EmptyState>
      )}
    </div>
  );
}
