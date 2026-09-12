"use client";

import { useMemo, useState } from "react";
import type { PublicCatalogPath } from "@cyberlearn/db";
import { PathCatalogCard } from "@/app/_components/path-catalog-card";
import { PublicNavbar } from "@/app/_components/public-navbar";
import "@/app/(app)/paths/_components/paths-catalog-v2.css";
import "./catalogue.css";

type Category = "ALL" | "CYBERSEC" | "DEV" | "NETWORK";

export function PublicCatalogue({ paths }: { paths: PublicCatalogPath[] }): React.JSX.Element {
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
    <div className="public-catalogue">
      <PublicNavbar />

      <main className="public-catalogue__main">
        <div className="public-catalogue__crumb" aria-hidden="true">
          <span>$</span> ~/ cyberlearn / catalogue
        </div>
        <section className="public-catalogue__hero" aria-labelledby="catalogue-title">
          <div>
            <p>Catalogue public</p>
            <h1 id="catalogue-title">
              Choisis ton <em>parcours.</em>
            </h1>
            <span>
              Explore les compétences, le niveau et le contenu avant de créer ton compte. Ton
              premier parcours commencera après l’inscription.
            </span>
          </div>
          <dl>
            <div>
              <dt>Parcours</dt>
              <dd>{paths.length}</dd>
            </div>
            <div>
              <dt>Domaines</dt>
              <dd>{new Set(paths.map((path) => path.category)).size}</dd>
            </div>
          </dl>
        </section>

        <section className="public-catalogue__filters" aria-label="Filtrer les parcours">
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
                className={category === value ? "is-active" : undefined}
                aria-pressed={category === value}
                onClick={() => {
                  setCategory(value);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <label>
            <span>Rechercher</span>
            <input
              type="search"
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
                  href="/register"
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
          <div className="public-catalogue__empty">
            <h2>Aucun parcours trouvé</h2>
            <p>Modifie les filtres ou réessaie dans quelques instants.</p>
          </div>
        )}
      </main>
    </div>
  );
}
