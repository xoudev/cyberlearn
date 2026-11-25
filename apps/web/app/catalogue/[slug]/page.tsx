import React, { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { statsRepository, type PublicPathDetail } from "@cyberlearn/db";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { groupIntoModules } from "@cyberlearn/lib/paths/modules";
import { pageAddress } from "@/app/page-metadata";
import { SITE_URL } from "@/app/site-url";
import { getActiveBan, getRequestUser } from "@/lib/auth";
import { brandTypeface } from "@/components/brand-typeface";

/**
 * One path of the catalogue, for somebody who has no account: what it
 * teaches, how long it takes, and its programme lesson by lesson.
 *
 * A visitor's card used to lead straight to the sign-up form, so the only
 * public page that named a path was the list of all of them, and a search
 * engine had nothing to show for "apprendre le pentest" but that list. The
 * lessons are named and described here, never shown: their content stays
 * behind the account.
 *
 * Somebody signed in has the path's own page, with their progress on it, and
 * is sent there.
 */

/** A slug as the catalogue writes them; anything else is not asked of the database. */
const SLUG = /^[a-z0-9-]{1,120}$/u;

/** Read once for the page and its metadata. A database that does not answer is a path not found. */
const loadPath = cache(async (slug: string): Promise<PublicPathDetail | null> => {
  if (!SLUG.test(slug)) return null;
  try {
    return await statsRepository.findPublicPath(slug);
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = await loadPath(slug);
  if (!path) return { title: "Parcours introuvable", robots: { index: false } };
  return {
    title: `${path.title} : le parcours`,
    description: path.description,
    ...pageAddress(`/catalogue/${path.slug}`, {
      title: `${path.title} : le parcours CyberLearn`,
      description: path.description,
    }),
  };
}

/** Minutes as a learner reads them: "45 min", "1 h 30". */
function duration(minutes: number): string {
  if (minutes < 60) return `${String(minutes)} min`;
  const rest = minutes % 60;
  return rest === 0
    ? `${String(Math.floor(minutes / 60))} h`
    : `${String(Math.floor(minutes / 60))} h ${String(rest).padStart(2, "0")}`;
}

/**
 * The path as schema.org describes a course, for the search engines that
 * read it. "<" is escaped: the block is data inside a script element, and a
 * title that held "</script>" must not end it.
 */
function courseJsonLd(path: PublicPathDetail): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: path.title,
    description: path.description,
    url: `${SITE_URL}/catalogue/${path.slug}`,
    inLanguage: "fr",
    isAccessibleForFree: true,
    educationalLevel: difficultyMeta(path.difficulty).label,
    timeRequired: `PT${String(path.estimatedHours)}H`,
    provider: { "@type": "Organization", name: "CyberLearn", url: SITE_URL },
    ...(path.rating !== null && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(path.rating.avg.toFixed(1)),
        ratingCount: path.rating.count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
  return JSON.stringify(data).replace(/</gu, "\\u003c");
}

export default async function PublicPathPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;

  // The layout's rule, read again (both reads are cached for the request).
  const viewer = await getRequestUser();
  if (viewer !== null && (await getActiveBan()) === null) redirect(`/paths/${slug}`);

  const path = await loadPath(slug);
  if (!path) notFound();

  const category = categoryMeta(path.category);
  const difficulty = difficultyMeta(path.difficulty);
  const groups = groupIntoModules(path.programme, path.modules);
  const facts: [label: string, value: string][] = [
    ["Domaine", category.label],
    ["Niveau", difficulty.label],
    ["Durée", `${String(path.estimatedHours)} h environ`],
    ["Leçons", String(path.lessons)],
    ["XP à gagner", String(path.xp)],
    [
      "À la fin",
      path.hasCertificate
        ? path.hasExam
          ? "Un examen, puis un certificat vérifiable"
          : "Un certificat vérifiable"
        : path.hasExam
          ? "Un examen final"
          : "Le parcours validé sur ton profil",
    ],
  ];

  return (
    <div className={`public-catalogue__main learning-catalogue public-path ${brandTypeface}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: courseJsonLd(path) }} />

      <nav className="public-path__crumb" aria-label="Fil d'Ariane">
        <Link href="/catalogue">Le catalogue</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{path.title}</span>
      </nav>

      <section className="catalogue-heading public-path__heading" aria-labelledby="path-title">
        <div>
          <p className="catalogue-heading__index">
            {category.label} · {path.track === "CAREER" ? "Parcours métier" : "Parcours compétence"}
          </p>
          <h1 id="path-title">{path.title}</h1>
          <p className="catalogue-heading__description">{path.description}</p>
          <div className="public-path__actions">
            <Link href="/register" className="home-button home-button--primary">
              Commencer ce parcours gratuitement
            </Link>
            <Link href="/login" className="home-button home-button--quiet">
              J’ai déjà un compte
            </Link>
          </div>
        </div>
        <aside className="catalogue-summary" aria-label="Le parcours en bref">
          <dl className="public-path__facts">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {path.rating !== null && (
            <p className="catalogue-summary__note">
              Noté {path.rating.avg.toFixed(1).replace(".", ",")} sur 5 par {path.rating.count}{" "}
              apprenant{path.rating.count > 1 ? "s" : ""}.
            </p>
          )}
        </aside>
      </section>

      <section className="public-path__programme" aria-labelledby="programme-title">
        <h2 id="programme-title">Le programme</h2>
        {path.programme.length === 0 ? (
          <p className="public-path__empty">Le programme de ce parcours arrive bientôt.</p>
        ) : (
          groups.map((group) => (
            <section key={group.key} className="public-path__module">
              <header>
                <p className="public-path__module-number">
                  Module {String(group.number).padStart(2, "0")}
                </p>
                {group.title !== null && <h3>{group.title}</h3>}
                {group.description !== null && group.description !== "" && (
                  <p className="public-path__module-description">{group.description}</p>
                )}
              </header>
              <ol>
                {group.indices.map((index) => {
                  const lesson = path.programme[index];
                  if (lesson === undefined) return null;
                  return (
                    <li key={index}>
                      <span className="public-path__lesson-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="public-path__lesson-text">
                        <strong>{lesson.title}</strong>
                        <span>{lesson.description}</span>
                      </span>
                      <span className="public-path__lesson-time">
                        {duration(lesson.estimatedMinutes)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))
        )}
      </section>

      <section className="public-path__closing" aria-label="Commencer">
        <p>Le compte est gratuit, et ta progression est gardée d’une leçon à l’autre.</p>
        <Link href="/register" className="home-button home-button--primary">
          Créer mon compte
        </Link>
      </section>
    </div>
  );
}
