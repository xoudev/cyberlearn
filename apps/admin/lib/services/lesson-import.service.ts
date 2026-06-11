import crypto from "node:crypto";
import matter from "gray-matter";
import { compile } from "@mdx-js/mdx";
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

/**
 * Four-layer validation pipeline for MDX lesson import.
 *
 * Layer 1 - Frontmatter parsing (gray-matter)
 * Layer 2 - Metadata Zod validation
 * Layer 3 - MDX body: injection check + dry-run compile
 * Layer 4 - Business rules: refCode/slug uniqueness, prerequisites exist
 */
export async function validateMdxContent(fileContent: string): Promise<ImportValidationResult> {
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

  // MDX dry-run compile
  try {
    await compile(body, {
      outputFormat: "function-body",
      development: false,
    });
  } catch (e) {
    return {
      valid: false,
      errors: [
        { message: `Erreur de compilation MDX: ${e instanceof Error ? e.message : "inconnu"}` },
      ],
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
    for (const prereq of metadata.prerequisites) {
      if (!foundRefCodes.has(prereq)) {
        errors.push({
          field: "prerequisites",
          message: `Prerequis introuvable: ${prereq}`,
        });
      }
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
