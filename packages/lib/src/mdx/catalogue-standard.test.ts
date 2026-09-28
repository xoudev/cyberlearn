import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The lesson standard of the new catalogue (docs/curriculum/README.md, « Le
 * standard d'une leçon »), checked on every lesson written for it.
 *
 * content.test.ts already proves every lesson renders. This proves the lessons
 * of the new catalogue are what the plan promised: objectives stated up front,
 * something to run, a quiz, a summary, and enough substance to be worth its
 * forty minutes. The first catalogue is not held to it; it is being replaced.
 *
 * A new-catalogue lesson lives in a folder named after its path code
 * (`f2-linux/`, `c3-securite-web/`) and is named after its refCode number
 * (`02001-...mdx`). Numbers 901 and up are module reviews (bilan): a quiz and a
 * project brief, held to a lighter version of the rule.
 */

const ROOT = path.resolve(__dirname, "../../../../content/lessons");
const CATALOGUE_DIR = /^[fdic]\d+-/;
// The plan's 2 500 to 4 000 words count everything; this counts prose alone
// (no code, no component, no diagram), which is about two thirds of it.
const MIN_WORDS = 1800;
const MIN_WORDS_REVIEW = 700;

interface CatalogueLesson {
  name: string;
  review: boolean;
  frontmatter: string;
  body: string;
}

function catalogueLessons(): CatalogueLesson[] {
  let dirs: string[];
  try {
    dirs = readdirSync(ROOT).filter(
      (d) => CATALOGUE_DIR.test(d) && statSync(path.join(ROOT, d)).isDirectory(),
    );
  } catch {
    return [];
  }
  return dirs.flatMap((dir) =>
    readdirSync(path.join(ROOT, dir))
      .filter((f) => f.endsWith(".mdx"))
      .map((file) => {
        const raw = readFileSync(path.join(ROOT, dir, file), "utf8").replace(/\r\n/g, "\n");
        const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
        return {
          name: `${dir}/${file}`,
          review: /^\d{2}9\d{2}-/.test(file),
          frontmatter: match?.[1] ?? "",
          body: match?.[2] ?? raw,
        };
      }),
  );
}

/**
 * Words of prose: code blocks, component lines (quizzes, terminals, links) and
 * diagrams do not count. A regex over tags would not do: a `<` written in code
 * in a sentence would swallow the prose up to the next `>`.
 */
function words(body: string): number {
  let inDiagram = false;
  const prose: string[] = [];
  for (const line of body.replace(/```[\s\S]*?```/g, " ").split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("<Diagram")) inDiagram = true;
    if (!inDiagram && !trimmed.startsWith("<")) prose.push(line);
    if (trimmed.startsWith("</Diagram>")) inDiagram = false;
  }
  return prose.join(" ").split(/\s+/).filter(Boolean).length;
}

const LESSONS = catalogueLessons();

describe.skipIf(LESSONS.length === 0)("the new catalogue's lesson standard", () => {
  it.each(LESSONS.map((l) => [l.name, l]))("%s", (_name, lesson) => {
    const { body, frontmatter, name, review } = lesson;
    const problems: string[] = [];
    const file = path.basename(name);

    const code = /^(\d{5})-/.exec(file)?.[1];
    if (!code || !frontmatter.includes(`refCode: CL-LSN-${code}-V`)) {
      problems.push("le nom du fichier ne commence pas par le numéro de son refCode");
    }
    for (const heading of ["## objectifs", "## quiz", "## à retenir"]) {
      if (!body.includes(`\n${heading}\n`)) problems.push(`section manquante : ${heading}`);
    }
    if (!body.includes("<QuizGroup>")) problems.push("pas de QuizGroup");
    const quizzes = (body.match(/<Quiz\s/g) ?? []).length;
    if (quizzes < 5) problems.push(`${String(quizzes)} questions, il en faut au moins 5`);
    if (/<Quiz\s(?![^>]*explanation=)[^>]*\/>/.test(body)) {
      problems.push("une question sans explication");
    }

    if (review) {
      if (words(body) < MIN_WORDS_REVIEW)
        problems.push(`moins de ${String(MIN_WORDS_REVIEW)} mots`);
      if (!body.includes("\n## projet")) problems.push("section manquante : ## projet");
    } else {
      if (words(body) < MIN_WORDS) problems.push(`moins de ${String(MIN_WORDS)} mots`);
      if (!/<(SimulatedTerminal|CodePlayground|PythonChallenge)\s/.test(body)) {
        problems.push("aucun exercice exécutable");
      }
      for (const heading of ["## pourquoi ça compte", "## les pièges", "## pour aller plus loin"]) {
        if (!body.includes(`\n${heading}\n`)) problems.push(`section manquante : ${heading}`);
      }
      if (!/<Diagram[\s>]/.test(body)) problems.push("aucun schéma");
    }

    expect(problems).toEqual([]);
  });
});
