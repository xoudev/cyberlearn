"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { PublicCatalogPath } from "@cyberlearn/db";
import "./catalogue.css";

const CATEGORY_LABELS = {
  CYBERSEC: "Cybersec",
  DEV: "Dev",
  NETWORK: "Réseau",
} as const;

const DIFFICULTY_LABELS = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
  EXPERT: "Expert",
} as const;

type Category = "ALL" | keyof typeof CATEGORY_LABELS;

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
      <header className="public-catalogue__nav">
        <Link href="/" className="public-catalogue__brand" aria-label="CyberLearn · accueil">
          <Image src="/icon_app.png" alt="" width={32} height={32} priority />
          <span>
            cyber<b>learn</b>
          </span>
        </Link>
        <nav aria-label="Navigation principale">
          <Link href="/">Accueil</Link>
          <Link href="/login">Connexion</Link>
          <Link href="/register" className="public-catalogue__signup">
            Commencer gratuitement
          </Link>
        </nav>
      </header>

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
          <section className="public-catalogue__grid" aria-label="Parcours disponibles">
            {visiblePaths.map((path) => (
              <article
                key={path.slug}
                id={path.slug}
                className={`public-path-card public-path-card--${path.category.toLowerCase()}`}
              >
                <div className="public-path-card__topline">
                  <span>{CATEGORY_LABELS[path.category]}</span>
                  <span>{DIFFICULTY_LABELS[path.difficulty]}</span>
                </div>
                <p className="public-path-card__ref">{"// " + path.refCode}</p>
                <h2>{path.title}</h2>
                <p className="public-path-card__description">{path.description}</p>
                <dl>
                  <div>
                    <dt>Missions</dt>
                    <dd>{path.lessons}</dd>
                  </div>
                  <div>
                    <dt>Durée</dt>
                    <dd>~{path.estimatedHours} h</dd>
                  </div>
                  <div>
                    <dt>XP</dt>
                    <dd>{path.xp.toLocaleString("fr-FR")}</dd>
                  </div>
                </dl>
                <div className="public-path-card__footer">
                  <span>{path.hasCertificate ? "Certificat inclus" : "Parcours pratique"}</span>
                  <Link href="/register">Commencer →</Link>
                </div>
              </article>
            ))}
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
