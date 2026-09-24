import crypto from "node:crypto";
import matter from "gray-matter";
import { checkLessonMdx, describeLessonMdxProblem } from "@cyberlearn/lib/mdx-check";
import {
  importLessonMetadataSchema,
  type ImportValidationResult,
  type ImportValidationError,
} from "@cyberlearn/types";
import { prisma } from "@cyberlearn/db";

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

/** Batch awareness for multi-file imports. */
export interface BatchValidationContext {
  /** refCodes declared by the OTHER files of the same batch. */
  peerRefCodes: readonly string[];
}

/**
 * Four-layer validation pipeline for MDX lesson import.
 *
 * Layer 1 - Frontmatter parsing (gray-matter)
 * Layer 2 - Metadata Zod validation
 * Layer 3 - MDX body: injection check + dry-run compile
 * Layer 4 - Business rules: refCode/slug uniqueness, prerequisites exist
 *
 * With a batch context, a prerequisite that is missing from the database but
 * declared by a sibling file downgrades to a warning: the batch import orders
 * files topologically, so the sibling lands first.
 */
export async function validateMdxContent(
  fileContent: string,
  batch?: BatchValidationContext,
): Promise<ImportValidationResult> {
  const errors: ImportValidationError[] = [];
  const warnings: string[] = [];

  // ── Layer 1: Parse frontmatter ────────────────────────────────────────────
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(fileContent);
  } catch (e) {
    return {
      valid: false,
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
    return { valid: false, errors, warnings };
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
        valid: false,
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
  // prop compiles perfectly well and only fails when it runs.
  const render = await checkLessonMdx(body);
  if (!render.ok) {
    return {
      valid: false,
      errors: [{ field: "contentMdx", message: describeLessonMdxProblem(render) }],
      warnings,
    };
  }

  // ── Layer 4: Business validation ─────────────────────────────────────────
  const [existingRefCode, existingSlug] = await Promise.all([
    prisma.lesson.findFirst({ where: { refCode: metadata.refCode }, select: { id: true } }),
    prisma.lesson.findFirst({ where: { slug: metadata.slug }, select: { id: true } }),
  ]);

  if (existingRefCode) {
    errors.push({
      field: "refCode",
      message: `Conflit: une leçon avec ce refCode existe déjà (ID: ${existingRefCode.id})`,
    });
  }

  if (existingSlug) {
    errors.push({
      field: "slug",
      message: `Conflit: une leçon avec ce slug existe déjà (ID: ${existingSlug.id})`,
    });
  }

  if (metadata.prerequisites.length > 0) {
    const prereqLessons = await prisma.lesson.findMany({
      where: { refCode: { in: metadata.prerequisites } },
      select: { refCode: true },
    });
    const foundRefCodes = new Set(prereqLessons.map((l) => l.refCode));
    const peerRefCodes = new Set(batch?.peerRefCodes ?? []);
    for (const prereq of metadata.prerequisites) {
      if (foundRefCodes.has(prereq)) continue;
      if (peerRefCodes.has(prereq)) {
        warnings.push(
          `Prérequis ${prereq} absent de la base mais fourni par le lot (il sera importé avant)`,
        );
        continue;
      }
      errors.push({
        field: "prerequisites",
        message: `Prerequis introuvable: ${prereq}`,
      });
    }
  }

  if (errors.length > 0) return { valid: false, errors, warnings };

  return { valid: true, errors: [], warnings, metadata, body };
}

export interface ImportResult {
  lessonId: string;
  refCode: string;
  contentHash: string;
}

/**
 * Atomically imports a validated MDX lesson into the database.
 * Creates the lesson in DRAFT status + prerequisite links.
 */
export async function importValidatedLesson(
  metadata: Awaited<ReturnType<typeof validateMdxContent>>["metadata"] & NonNullable<unknown>,
  body: string,
  authorId: string,
): Promise<ImportResult> {
  const contentHash = crypto.createHash("sha256").update(body).digest("hex");

  const lesson = await prisma.$transaction(async (tx) => {
    const created = await tx.lesson.create({
      data: {
        refCode: metadata.refCode,
        slug: metadata.slug,
        title: metadata.title,
        description: metadata.description,
        category: metadata.category,
        difficulty: metadata.difficulty,
        estimatedMinutes: metadata.estimatedMinutes,
        xpReward: metadata.xpReward,
        coverImageUrl: metadata.coverImageUrl ?? null,
        contentMdx: body,
        status: "DRAFT",
        authorId: authorId,
      },
    });

    if (metadata.prerequisites.length > 0) {
      const prereqLessons = await tx.lesson.findMany({
        where: { refCode: { in: metadata.prerequisites } },
        select: { id: true, refCode: true },
      });

      await tx.lessonPrerequisite.createMany({
        data: prereqLessons.map((p) => ({
          lessonId: created.id,
          prerequisiteId: p.id,
        })),
      });
    }

    return created;
  });

  return { lessonId: lesson.id, refCode: lesson.refCode, contentHash };
}

// ── Batch ordering ────────────────────────────────────────────────────────────

export interface BatchOrderItem {
  /** Stable identifier of the file inside the batch (e.g. its name). */
  id: string;
  refCode: string;
  prerequisites: readonly string[];
}

export interface BatchOrderResult {
  /** Item ids in a prerequisite-safe import order (dependencies first). */
  ordered: string[];
  /** Item ids stuck in a prerequisite cycle inside the batch. */
  cyclic: string[];
}

/**
 * Orders a batch so that any file whose prerequisites are provided by sibling
 * files imports AFTER them (Kahn's algorithm on the intra-batch edges only;
 * prerequisites already in the database are irrelevant to the ordering).
 * Files stuck behind an intra-batch prerequisite cycle (members of the cycle
 * AND their dependents) are reported in `cyclic` instead of ordered.
 *
 * Precondition: refCodes are unique across items. Callers must reject
 * intra-batch duplicates beforehand (last declarer wins in the edge map).
 */
export function orderBatchByPrerequisites(items: readonly BatchOrderItem[]): BatchOrderResult {
  const byRefCode = new Map(items.map((it) => [it.refCode, it]));
  const indegree = new Map<string, number>(items.map((it) => [it.id, 0]));
  const dependents = new Map<string, string[]>(items.map((it) => [it.id, []]));

  for (const item of items) {
    for (const prereq of item.prerequisites) {
      const provider = byRefCode.get(prereq);
      if (provider === undefined || provider.id === item.id) continue;
      indegree.set(item.id, (indegree.get(item.id) ?? 0) + 1);
      dependents.get(provider.id)?.push(item.id);
    }
  }

  const queue = items.filter((it) => (indegree.get(it.id) ?? 0) === 0).map((it) => it.id);
  const ordered: string[] = [];
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    ordered.push(id);
    for (const dep of dependents.get(id) ?? []) {
      const next = (indegree.get(dep) ?? 0) - 1;
      indegree.set(dep, next);
      if (next === 0) queue.push(dep);
    }
  }

  const orderedSet = new Set(ordered);
  const cyclic = items.filter((it) => !orderedSet.has(it.id)).map((it) => it.id);
  return { ordered, cyclic };
}
