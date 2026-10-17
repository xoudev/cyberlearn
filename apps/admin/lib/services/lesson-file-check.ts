import matter from "gray-matter";
import { checkLessonForSave, emDashProblems } from "@cyberlearn/lib/mdx-authoring";
import { describeLessonMdxProblemAt, placedAfter } from "@cyberlearn/lib/mdx-check";
import {
  importLessonMetadataSchema,
  type ImportValidationResult,
  type ImportValidationError,
} from "@cyberlearn/types";

/**
 * What a lesson file must pass, whatever is done with it: imported, brought
 * up to date from the repository, or checked by hand in content/ with
 * content-check.mjs before it is pushed. One module, without the database, so
 * that the script can load it and no door is wider than another.
 */

// Tags / attributes that indicate script injection
const INJECTION_PATTERNS = [
  /<script[\s>]/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /javascript:/i,
  /data:text\/html/i,
  /\bon[A-Z][a-zA-Z]*\s*=/, // inline event handlers (camelCase: onChange=, onClick=, …)
  /dangerouslySetInnerHTML/i,
];

/** Metadata as the import schema reads it off a lesson file's frontmatter. */
export type LessonFileMetadata = NonNullable<ImportValidationResult["metadata"]>;

export type LessonFileCheck =
  | { ok: true; metadata: LessonFileMetadata; body: string; warnings: string[] }
  | { ok: false; errors: ImportValidationError[]; warnings: string[] };

/**
 * The first three layers of the import. Shared with the update from the
 * repository, so a lesson cannot reach the database by one door that the
 * other would refuse.
 *
 * Layer 1 - Frontmatter parsing (gray-matter)
 * Layer 2 - Metadata Zod validation
 * Layer 3 - MDX body: injection check, then the check the editors run on save
 *           (it renders, and it keeps the catalogue's rules), each problem at
 *           its line in the file; and no em dash in the frontmatter either,
 *           which CI refuses anywhere in a content/ file
 */
export async function checkLessonFile(fileContent: string): Promise<LessonFileCheck> {
  const errors: ImportValidationError[] = [];
  const warnings: string[] = [];

  // ── Layer 1: Parse frontmatter ────────────────────────────────────────────
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(fileContent);
  } catch (e) {
    return {
      ok: false,
      errors: [
        { message: `Erreur de parsing YAML: ${e instanceof Error ? e.message : "inconnu"}` },
      ],
      warnings: [],
    };
  }

  const body = parsed.content.trim();

  // ── Layer 2: Zod metadata validation ─────────────────────────────────────
  const metaParsed = importLessonMetadataSchema.safeParse(parsed.data);
  if (!metaParsed.success) {
    for (const issue of metaParsed.error.issues) {
      errors.push({
        field: issue.path.join("."),
        message: issue.message,
      });
    }
    return { ok: false, errors, warnings };
  }

  const metadata = metaParsed.data;

  // ── Layer 3: Injection detection + MDX dry-run compile ───────────────────
  // Strip fenced and inline code blocks so patterns like onChange= in code
  // examples don't trigger false positives.
  const bodyWithoutCode = body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");

  for (const pattern of INJECTION_PATTERNS) {
    const match = pattern.exec(bodyWithoutCode);
    if (match) {
      // Find the line number in the original body for the matched position
      const matchIndexInStripped = match.index;
      const snippet = bodyWithoutCode
        .slice(Math.max(0, matchIndexInStripped - 40), matchIndexInStripped + 60)
        .replace(/\n/g, " ")
        .trim();

      return {
        ok: false,
        errors: [
          {
            message: `Contenu rejeté, injection potentielle détectée (pattern: ${pattern.toString()}) - contexte : "…${snippet}…"`,
          },
        ],
        warnings,
      };
    }
  }

  // Word count warnings
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  if (wordCount < 300) warnings.push(`Contenu court (${String(wordCount)} mots, recommandé: 300+)`);
  if (wordCount > 5000) warnings.push(`Contenu long (${String(wordCount)} mots)`);

  // Check for unflagged code fences
  const codeFences = body.matchAll(/^```(?!\w)/gm);
  const unflaggedCount = [...codeFences].length;
  if (unflaggedCount > 0) {
    warnings.push(
      `${String(unflaggedCount)} bloc${unflaggedCount > 1 ? "s" : ""} de code sans langage précisé`,
    );
  }

  // MDX dry-run: compiled *and* run, section by section, with the lesson
  // page's own remark plugins. A compile alone was the check here, and it let
  // through the two errors Sentry recorded on 22 September - `True` inside a
  // prop compiles perfectly well and only fails when it runs. Then the rules
  // CI applies to content/: an authoring note, an em dash, a diagram that
  // markdown rewrites.
  // The frontmatter and what the trim took off the top, before the body.
  const start = fileContent.lastIndexOf(body);
  const before = fileContent.slice(0, start);

  // The typography rule holds for the whole file, as CI applies it: a title
  // or a description is published too. Those of the body are the save
  // check's, below.
  const beforeLines = before.split("\n");
  const frontmatter: ImportValidationError[] = emDashProblems(before).map((problem) => {
    const field = /^(\w+)\s*:/.exec(beforeLines[problem.line - 1] ?? "")?.[1];
    return {
      ...(field === undefined ? {} : { field }),
      line: problem.line,
      message: `Frontmatter, ligne ${String(problem.line)}, colonne ${String(problem.column)} : ${problem.message}`,
    };
  });

  // The body's places, counted in the file.
  const render = placedAfter(await checkLessonForSave(body), before);
  if (!render.ok) {
    const listed: ImportValidationError[] = render.problems.map((problem) => ({
      field: "contentMdx",
      line: problem.line,
      message: describeLessonMdxProblemAt(problem),
    }));
    const rest = render.total - render.problems.length;
    if (rest > 0) {
      listed.push({
        field: "contentMdx",
        message: `Il y a encore ${String(rest)} autre${rest > 1 ? "s" : ""} problème${rest > 1 ? "s" : ""}.`,
      });
    }
    return { ok: false, errors: [...frontmatter, ...listed], warnings };
  }
  if (frontmatter.length > 0) return { ok: false, errors: frontmatter, warnings };

  return { ok: true, metadata, body, warnings };
}
