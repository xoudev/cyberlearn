import type { LessonContent, LessonVersionSource } from "@cyberlearn/db";
import type { AutosaveStatus } from "@cyberlearn/ui/lesson-studio";
import { LESSON_DRAFT_LIMITS } from "@/lib/lesson-limits";

/**
 * What the lesson studio holds, and every way it changes.
 *
 * Every field is controlled and lives here, never in the DOM: React 19 resets
 * a form once its action settles, and the console's lesson form lost what was
 * typed in every uncontrolled field to that reset, on a refusal too. The
 * studio has no form to reset. A publish that fails changes the errors and
 * nothing else; only a publish that went through, a discard and a restored
 * version replace the fields.
 */

export type StudioCategory = LessonContent["category"];
export type StudioDifficulty = LessonContent["difficulty"];

/** The lesson as the studio edits it: numbers as typed, no cover as "". */
export interface StudioFields {
  refCode: string;
  slug: string;
  title: string;
  description: string;
  category: StudioCategory;
  difficulty: StudioDifficulty;
  estimatedMinutes: string;
  xpReward: string;
  coverImageUrl: string;
  contentMdx: string;
}

export type StudioField = keyof StudioFields;

/** What a draft is saved as: the columns' own types. */
export interface StudioDraftContent {
  refCode: string;
  slug: string;
  title: string;
  description: string;
  category: StudioCategory;
  difficulty: StudioDifficulty;
  estimatedMinutes: number;
  xpReward: number;
  contentMdx: string;
  coverImageUrl: string | null;
}

export function fieldsOf(content: LessonContent): StudioFields {
  return {
    refCode: content.refCode,
    slug: content.slug,
    title: content.title,
    description: content.description,
    category: content.category,
    difficulty: content.difficulty,
    estimatedMinutes: String(content.estimatedMinutes),
    xpReward: String(content.xpReward),
    coverImageUrl: content.coverImageUrl ?? "",
    contentMdx: content.contentMdx,
  };
}

/**
 * A number field as the draft stores it. Cleared, or not a whole number yet,
 * it is saved as 0, and past what its column holds, as that: the draft keeps
 * going, and the publish says the field is wrong.
 */
export function wholeNumber(typed: string): number {
  const value = Number(typed.trim());
  if (!Number.isInteger(value) || value < 0) return 0;
  return Math.min(value, LESSON_DRAFT_LIMITS.numberMax);
}

export function draftContentOf(fields: StudioFields): StudioDraftContent {
  return {
    refCode: fields.refCode,
    slug: fields.slug,
    title: fields.title,
    description: fields.description,
    category: fields.category,
    difficulty: fields.difficulty,
    estimatedMinutes: wholeNumber(fields.estimatedMinutes),
    xpReward: wholeNumber(fields.xpReward),
    contentMdx: fields.contentMdx,
    coverImageUrl: fields.coverImageUrl === "" ? null : fields.coverImageUrl,
  };
}

const FIELD_KEYS: readonly StudioField[] = [
  "refCode",
  "slug",
  "title",
  "description",
  "category",
  "difficulty",
  "estimatedMinutes",
  "xpReward",
  "coverImageUrl",
  "contentMdx",
];

/** The same lesson, as the draft would store it: "015" minutes are 15. */
export function sameContent(a: StudioFields, b: StudioFields): boolean {
  const left = draftContentOf(a);
  const right = draftContentOf(b);
  return FIELD_KEYS.every((key) => left[key] === right[key]);
}

export type StudioConflict = "draft" | "lesson" | "quizzes";

export interface StudioState {
  fields: StudioFields;
  /** What the lesson holds now: what the page opened on, then each publish. */
  published: StudioFields;
  /** Why the last publish was refused, field by field. */
  fieldErrors: Partial<Record<StudioField, string>>;
  /** Why the last publish was refused, in a sentence. */
  error: string | null;
  /**
   * The last refusal is one the author can go past, or must reload for: the
   * lesson changed under the draft, the draft under the studio, or the
   * publish would change quizzes that already have answers.
   */
  conflict: StudioConflict | null;
}

export type StudioAction =
  | { type: "edit"; field: StudioField; value: string }
  | { type: "replace"; fields: StudioFields }
  | {
      type: "refused";
      error: string;
      fieldErrors?: Partial<Record<string, string>> | undefined;
      conflict?: StudioConflict | undefined;
    }
  | { type: "published"; published: StudioFields; replaceFields: boolean }
  /** The draft is gone: back to the lesson as it is now, which may not be what the page loaded. */
  | { type: "discarded"; published: StudioFields }
  | { type: "dismiss" };

/**
 * `lessonChanged`, when the draft the studio opens on was started from a
 * lesson that has changed since (a sync, an import, another publish): the
 * studio opens on the conflict its publish would meet, with that sentence.
 */
export function initialStudioState(
  published: StudioFields,
  working: StudioFields,
  lessonChanged: string | null = null,
): StudioState {
  return {
    fields: working,
    published,
    fieldErrors: {},
    error: lessonChanged,
    conflict: lessonChanged === null ? null : "lesson",
  };
}

function isStudioField(key: string): key is StudioField {
  return FIELD_KEYS.some((field) => field === key);
}

/** The errors of a refusal that name a field the studio shows. */
function studioFieldErrors(
  errors: Partial<Record<string, string>>,
): Partial<Record<StudioField, string>> {
  const out: Partial<Record<StudioField, string>> = {};
  for (const [key, message] of Object.entries(errors)) {
    if (isStudioField(key) && message !== undefined) out[key] = message;
  }
  return out;
}

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case "edit": {
      // A field's error goes once the field is touched; the others stay.
      const fieldErrors: Partial<Record<StudioField, string>> = {};
      for (const key of FIELD_KEYS) {
        const message = state.fieldErrors[key];
        if (key !== action.field && message !== undefined) fieldErrors[key] = message;
      }
      // The quizzes the last refusal named are those of the content it read:
      // typed in, they may no longer be the ones a publish would change.
      const staleQuizzes = state.conflict === "quizzes" && action.field === "contentMdx";
      return {
        ...state,
        fields: { ...state.fields, [action.field]: action.value },
        fieldErrors,
        error: staleQuizzes ? null : state.error,
        conflict: staleQuizzes ? null : state.conflict,
      };
    }
    case "replace":
      return { ...state, fields: action.fields, fieldErrors: {}, error: null, conflict: null };
    case "refused":
      // The fields stay exactly as typed: only the errors change.
      return {
        ...state,
        error: action.error,
        fieldErrors: studioFieldErrors(action.fieldErrors ?? {}),
        conflict: action.conflict ?? null,
      };
    case "published":
      return {
        ...state,
        published: action.published,
        fields: action.replaceFields ? action.published : state.fields,
        fieldErrors: {},
        error: null,
        conflict: null,
      };
    case "discarded":
      return {
        ...state,
        published: action.published,
        fields: action.published,
        fieldErrors: {},
        error: null,
        conflict: null,
      };
    case "dismiss":
      return { ...state, error: null, conflict: null };
  }
}

// ── What the studio says ──────────────────────────────────────────────────────

/** Hours and minutes in Paris: the same on the server's render and in the browser. */
const CLOCK = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

/**
 * Where the draft stands, in the studio's bar. `hasDraft` tells a lesson with
 * nothing written since its publication from one whose draft is saved.
 */
export function autosaveLabel({
  status,
  savedAt,
  hasDraft,
  error,
}: {
  status: AutosaveStatus;
  savedAt: Date | null;
  hasDraft: boolean;
  error: string | null;
}): string {
  switch (status) {
    case "pending":
      return "Modifications non enregistrées";
    case "saving":
      return "Enregistrement du brouillon…";
    case "error":
      return error ?? "Le brouillon n'a pas été enregistré.";
    case "conflict":
      return "Brouillon modifié ailleurs : recharge la page.";
    case "saved":
    case "idle":
      if (!hasDraft) return "Aucun brouillon : la leçon est telle qu'elle est publiée.";
      return savedAt === null
        ? "Brouillon enregistré"
        : `Brouillon enregistré à ${CLOCK.format(savedAt)}`;
  }
}

/** Where a version came from, in the version list. */
export const VERSION_SOURCE_LABEL: Record<LessonVersionSource, string> = {
  BASELINE: "Avant le studio",
  CONSOLE: "Console",
  IMPORT: "Import",
  SYNC: "Synchronisation",
};
