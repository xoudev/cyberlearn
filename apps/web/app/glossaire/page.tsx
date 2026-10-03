import type { Metadata } from "next";
import { GLOSSARY, type GlossaryCategory } from "@cyberlearn/lib/glossary/terms";
import { PublicNavbar } from "@/app/_components/public-navbar";
import "./glossaire.css";

export const metadata: Metadata = {
  title: "Glossaire",
  description:
    "Les mots techniques des leçons CyberLearn, du DNS au rançongiciel, chacun expliqué en une phrase.",
  alternates: { canonical: "/glossaire" },
};

/** The order the categories are read in: from the wire up to the law. */
const CATEGORIES: readonly GlossaryCategory[] = [
  "Matériel",
  "Système",
  "Réseau",
  "Sécurité",
  "Cryptographie",
  "Développement",
  "Données et droit",
];

function anchor(category: GlossaryCategory): string {
  return category
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .replace(/[^a-z]+/gu, "-");
}

/**
 * Every word the lessons underline, with its definition: the same list, so a
 * word read on hover in a lesson is found here under the same name. Each one
 * has an anchor (`/glossaire#dns`). Public, like the catalogue: a definition
 * is worth reading before signing up too.
 */
export default function GlossaryPage(): React.JSX.Element {
  const collator = new Intl.Collator("fr", { sensitivity: "base" });
  return (
    <div className="glossary-page">
      <PublicNavbar />
      <main className="glossary-page__main">
        <div className="glossary-page__crumb" aria-hidden="true">
          <span>$</span> ~/ cyberlearn / glossaire
        </div>
        <header className="glossary-page__hero">
          <p>Glossaire</p>
          <h1>
            Les mots du <em>métier.</em>
          </h1>
          <span>
            Les {GLOSSARY.length} termes techniques que les leçons soulignent, chacun expliqué en
            une phrase. Dans une leçon, survole un mot souligné en pointillés pour lire sa
            définition.
          </span>
        </header>

        <nav className="glossary-page__index" aria-label="Catégories du glossaire">
          {CATEGORIES.map((category) => (
            <a key={category} href={`#${anchor(category)}`}>
              {category}
            </a>
          ))}
        </nav>

        {CATEGORIES.map((category) => {
          const terms = GLOSSARY.filter((t) => t.category === category).sort((a, b) =>
            collator.compare(a.term, b.term),
          );
          return (
            <section
              key={category}
              id={anchor(category)}
              className="glossary-page__section"
              aria-labelledby={`${anchor(category)}-title`}
            >
              <h2 id={`${anchor(category)}-title`}>{category}</h2>
              <dl>
                {terms.map((term) => (
                  <div key={term.slug} id={term.slug} className="glossary-page__entry">
                    <dt>{term.term}</dt>
                    <dd>{term.definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </main>
    </div>
  );
}
