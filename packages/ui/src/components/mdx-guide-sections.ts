import {
  guideUrl,
  LESSON_COMPONENT_FAMILIES,
  LESSON_COMPONENTS,
  type LessonComponentExample,
  type LessonComponentFamily,
} from "@cyberlearn/lib/mdx-components";

/**
 * What the editor's guide panel lists: Markdown first, then one section per
 * component family, each component a group of insertable examples.
 *
 * Built from the registry in @cyberlearn/lib rather than written here, so the
 * panel cannot lag behind the pipeline again: a component the registry gains
 * appears in the guide of both editors, the console's and the teacher's, with
 * nothing to do on this side. The Markdown section is the one thing that is
 * the panel's own, since Markdown is not a component.
 */

export type GuideEntry = LessonComponentExample;

export interface GuideGroup {
  /** The component's tag name; absent for the Markdown group. */
  name?: string;
  /** In French: "Encadré", "Trouve la faille". */
  label: string;
  description?: string;
  /** The component's section of the authoring guide. */
  docUrl?: string;
  entries: GuideEntry[];
}

export interface GuideSection {
  id: string;
  title: string;
  /** The family's colour in the panel: a fixed set telling families apart, not the reader's accent. */
  accent: string;
  groups: GuideGroup[];
}

const FAMILY_ACCENTS: Record<LessonComponentFamily, string> = {
  callout: "#4D8BFF",
  quiz: "#FFB020",
  code: "#0AFFD4",
  terminal: "#B14DFF",
  media: "#FF6B9D",
  reading: "#FF4D6D",
  database: "#6E8BFF",
  git: "#FFB547",
  network: "#4DD4FF",
  investigation: "#39FF14",
  crypto: "#FF4DD2",
  ordering: "#D0CDEC",
  web: "#8B7CFF",
};

const MARKDOWN_SECTION: GuideSection = {
  id: "markdown",
  title: "Markdown",
  accent: "#7F7BA9",
  groups: [
    {
      label: "Texte",
      entries: [
        { label: "H2", snippet: "## Section\n" },
        { label: "H3", snippet: "### Sous-section\n" },
        { label: "Gras", snippet: "**texte en gras**" },
        { label: "Italique", snippet: "*texte en italique*" },
        { label: "Code", snippet: "`code inline`" },
        { label: "Liste", snippet: "- Élément 1\n- Élément 2\n- Élément 3\n" },
        { label: "Numéros", snippet: "1. Première étape\n2. Deuxième étape\n3. Troisième étape\n" },
        { label: "Lien", snippet: "[texte](https://example.com)" },
        { label: "Citation", snippet: "> Une phrase à retenir.\n" },
        {
          label: "Tableau",
          snippet:
            "| Commande | Rôle |\n| --- | --- |\n| `cp` | copier |\n| `mv` | déplacer ou renommer |\n",
        },
        { label: "HR", snippet: "\n---\n\n" },
        { label: "Bloc code", snippet: "```python\n# code ici\nprint('Hello')\n```\n" },
      ],
    },
  ],
};

export function guideSections(): GuideSection[] {
  return [
    MARKDOWN_SECTION,
    ...LESSON_COMPONENT_FAMILIES.map(
      (family): GuideSection => ({
        id: family.id,
        title: family.label,
        accent: FAMILY_ACCENTS[family.id],
        groups: LESSON_COMPONENTS.filter((spec) => spec.family === family.id).map(
          (spec): GuideGroup => ({
            name: spec.name,
            label: spec.label,
            description: spec.description,
            docUrl: guideUrl(spec),
            entries: [...spec.examples],
          }),
        ),
      }),
    ),
  ];
}

/** Lowercased, accents stripped: "Encadré" and "encadre" are the same word to a search box. */
function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/**
 * The sections cut down to what matches `query`. A component whose name, label
 * or description matches keeps all its examples; otherwise its examples are
 * kept one by one on their label, description and first line. Sections and
 * groups left empty disappear. An empty query returns everything.
 */
export function filterGuide(sections: readonly GuideSection[], query: string): GuideSection[] {
  const needle = fold(query.trim());
  if (needle === "") return [...sections];

  const matches = (...texts: (string | undefined)[]): boolean =>
    texts.some((text) => text !== undefined && fold(text).includes(needle));

  return sections.flatMap((section): GuideSection[] => {
    const groups = section.groups.flatMap((group): GuideGroup[] => {
      if (matches(group.name, group.label, group.description)) return [group];
      const entries = group.entries.filter((entry) =>
        matches(entry.label, entry.description, entry.snippet.split("\n")[0]),
      );
      return entries.length === 0 ? [] : [{ ...group, entries }];
    });
    return groups.length === 0 ? [] : [{ ...section, groups }];
  });
}
