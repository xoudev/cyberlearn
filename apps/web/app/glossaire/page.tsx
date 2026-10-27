import type { Metadata } from "next";
import { GLOSSARY, type GlossaryCategory } from "@cyberlearn/lib/glossary/terms";
import { pageAddress } from "@/app/page-metadata";

export const metadata: Metadata = {
  title: "Glossaire",
  description:
    "Les mots techniques des leçons CyberLearn, du DNS au rançongiciel, chacun expliqué en une phrase.",
  ...pageAddress("/glossaire"),
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
 * is worth reading before signing up too. The frame around it, the app's or
 * the public navbar, is the layout's.
 */
export default function GlossaryPage(): React.JSX.Element {
  const collator = new Intl.Collator("fr", { sensitivity: "base" });
  return (
    <div className="glossary-page__main">
      <header className="glossary-page__hero">
        <div>
          <p className="glossary-page__label">Lire / Retrouver une définition</p>
          <h1>
            Les mots du <em>métier.</em>
          </h1>
          <p className="glossary-page__intro">
            Les termes techniques des leçons, chacun expliqué en une phrase. Dans une leçon, survole
            un mot souligné en pointillés pour lire sa définition.
          </p>
        </div>
        <aside
          className="glossary-page__count"
          aria-label={`${String(GLOSSARY.length)} termes dans ${String(CATEGORIES.length)} catégories`}
        >
          <strong>{GLOSSARY.length}</strong>
          <span>termes à retrouver</span>
          <p>{CATEGORIES.length} catégories · les mêmes définitions que dans les leçons</p>
        </aside>
      </header>

      <nav className="glossary-page__index" aria-label="Catégories du glossaire">
        {CATEGORIES.map((category) => (
          <a key={category} href={`#${anchor(category)}`}>
            {category}
          </a>
        ))}
      </nav>

      {CATEGORIES.map((category, index) => {
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
            <h2 id={`${anchor(category)}-title`}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              {category}
            </h2>
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
    </div>
  );
}
