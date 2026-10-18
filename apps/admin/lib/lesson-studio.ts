import { z } from "zod";
import { lessonRefCodeSchema, UPLOADED_COVER_PREFIX } from "@cyberlearn/types";
import { emDashInField, holdsNoEmDash } from "@cyberlearn/lib/mdx-authoring";
import { LESSON_LIMITS, LESSON_SLUG, LESSON_SLUG_HINT } from "@/lib/lesson-limits";

/**
 * The two sets of rules of the lesson studio (apps/admin/app/(admin)/lessons/[id]).
 *
 * A draft is half-written by nature: a title not long enough yet, a slug
 * still being typed, MDX that does not render. It takes anything its columns
 * can hold, so the autosave never loses a keystroke to a rule. Publishing is
 * where the rules apply, the ones the console's form always had, plus the MDX
 * check (checkLessonForSave) the action runs after these.
 *
 * Server-only: the em dash rule comes with the MDX compiler, which has no
 * place in the browser's bundle.
 */

const CATEGORY = z.enum(["DEV", "CYBERSEC", "NETWORK"]);
const DIFFICULTY = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]);
const COVER = z.union([z.url(), z.string().startsWith(UPLOADED_COVER_PREFIX)]);

/** The longest MDX a draft takes, as the preview does. */
export const DRAFT_MDX_MAX = 200_000;

/** What a draft holds, as typed: bounded by its columns and nothing else. */
export const lessonDraftContentSchema = z.object({
  refCode: z.string().max(64),
  slug: z.string().max(LESSON_LIMITS.slugMax),
  title: z.string().max(LESSON_LIMITS.titleMax),
  description: z.string().max(LESSON_LIMITS.descriptionMax),
  category: CATEGORY,
  difficulty: DIFFICULTY,
  estimatedMinutes: z.number().int().min(0).max(LESSON_LIMITS.minutesMax),
  xpReward: z.number().int().min(0).max(LESSON_LIMITS.xpMax),
  contentMdx: z.string().max(DRAFT_MDX_MAX),
  coverImageUrl: COVER.nullable(),
});

export type LessonDraftContent = z.infer<typeof lessonDraftContentSchema>;

/** What a publish requires of the draft: the rules of the console's lesson form. */
export const lessonPublishSchema = z.object({
  refCode: lessonRefCodeSchema,
  slug: z
    .string()
    .regex(LESSON_SLUG, LESSON_SLUG_HINT)
    .min(LESSON_LIMITS.slugMin)
    .max(LESSON_LIMITS.slugMax),
  title: z
    .string()
    .trim()
    .min(LESSON_LIMITS.titleMin)
    .max(LESSON_LIMITS.titleMax)
    .refine(holdsNoEmDash, emDashInField("Le titre")),
  description: z
    .string()
    .trim()
    .min(LESSON_LIMITS.descriptionMin)
    .max(LESSON_LIMITS.descriptionMax)
    .refine(holdsNoEmDash, emDashInField("La description")),
  category: CATEGORY,
  difficulty: DIFFICULTY,
  estimatedMinutes: z.number().int().positive().max(LESSON_LIMITS.minutesMax),
  xpReward: z.number().int().nonnegative().max(LESSON_LIMITS.xpMax),
  // Trimmed, which is what is checked and published, and as typed, which is
  // where the editor marks what the check found (asTyped).
  contentMdx: z
    .string()
    .transform((typed) => ({ typed, text: typed.trim() }))
    .pipe(z.object({ typed: z.string(), text: z.string().min(10) })),
  coverImageUrl: COVER.nullable(),
});

/** The first message of each field the publish refused, keyed by field. */
export function publishFieldErrors(error: z.ZodError): Partial<Record<string, string>> {
  const fieldErrors: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && fieldErrors[field] === undefined) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

/** What the studio says for each reason a publish or a save did not go through. */
export const STUDIO_MESSAGES = {
  draftConflict:
    "Le brouillon a changé ailleurs (un autre onglet, ou un autre administrateur l'a enregistré, publié ou abandonné). Recharge la page pour reprendre la dernière version.",
  lessonChanged:
    "La leçon publiée a changé depuis le début de ce brouillon (synchronisation avec le dépôt, ou publication par quelqu'un d'autre). Publier la remplacera par le brouillon.",
  nothingToPublish: "Rien à publier : le brouillon reprend la leçon telle qu'elle est en ligne.",
  notFound: "Cette leçon n'existe plus.",
  stale: "La leçon a été modifiée pendant la publication. Recharge la page.",
  refCodeTaken: "Ce refCode existe déjà.",
  slugTaken: "Ce slug existe déjà.",
  invalidForm: "Des champs sont à corriger avant de publier.",
} as const;
