"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  lessonContentOf,
  lessonDraftRepository,
  lessonVersionRepository,
  prisma,
  type LessonContent,
} from "@cyberlearn/db";
import { checkLessonForSave } from "@cyberlearn/lib/mdx-authoring";
import {
  asTyped,
  describeLessonMdxProblem,
  editorProblemsOf,
  type LessonEditorProblem,
} from "@cyberlearn/lib/mdx-check";
import { requireAdminAction } from "@/lib/auth";
import {
  lessonDraftContentSchema,
  lessonPublishSchema,
  publishFieldErrors,
  STUDIO_MESSAGES,
} from "@/lib/lesson-studio";

/**
 * The lesson studio's actions: save the draft, publish it, discard it,
 * restore a version into it. See lessonDraftRepository for the draft and
 * lessonVersionRepository for what a publish writes.
 *
 * Nothing here writes the lesson but the publish, and the publish only after
 * the draft has passed the form's rules and the MDX check: a draft can be
 * broken, a lesson cannot.
 */

const ISO_STAMP = z.iso.datetime();

const saveInput = z.object({
  lessonId: z.guid(),
  /** The draft's updatedAt as the studio last saw it; null when it saw none. */
  expectedUpdatedAt: ISO_STAMP.nullable(),
  content: lessonDraftContentSchema,
});

export type SaveLessonDraftResult =
  | {
      ok: true;
      savedAt: string;
      /** What publishing would refuse in the content, for the editor to mark now. */
      problems: LessonEditorProblem[];
    }
  | { ok: false; error: string; conflict?: boolean };

export async function saveLessonDraftAction(input: unknown): Promise<SaveLessonDraftResult> {
  const admin = await requireAdminAction();
  const parsed = saveInput.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message ?? "contenu invalide";
    return { ok: false, error: `Brouillon non enregistré : ${issue}` };
  }
  const { lessonId, expectedUpdatedAt, content } = parsed.data;

  const saved = await lessonDraftRepository.save(lessonId, content, {
    actorId: admin.id,
    expectedUpdatedAt: expectedUpdatedAt === null ? null : new Date(expectedUpdatedAt),
  });
  if (!saved.ok) {
    return {
      ok: false,
      error: saved.reason === "conflict" ? STUDIO_MESSAGES.draftConflict : STUDIO_MESSAGES.notFound,
      conflict: true,
    };
  }

  // The check the publish will run: the draft is saved whatever it finds,
  // and the editor marks it now rather than at the publish.
  const check = asTyped(await checkLessonForSave(content.contentMdx.trim()), content.contentMdx);
  return { ok: true, savedAt: saved.updatedAt.toISOString(), problems: editorProblemsOf(check) };
}

const publishInput = z.object({
  lessonId: z.guid(),
  /** The draft's updatedAt as the studio last saved it: what it shows is what is published. */
  expectedUpdatedAt: ISO_STAMP,
  /** Publish over a lesson that changed since the draft was started, once told. */
  force: z.boolean().optional(),
});

export type PublishLessonChangesResult =
  | { ok: true; version: number; content: LessonContent }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<string, string>>;
      problems?: LessonEditorProblem[];
      /** The draft moved under the studio, or the lesson moved under the draft. */
      conflict?: "draft" | "lesson";
      /**
       * The draft held what the lesson already does, and is gone: `content` is
       * that lesson, for the studio to show as published.
       */
      discarded?: { content: LessonContent };
    };

export async function publishLessonChangesAction(
  input: unknown,
): Promise<PublishLessonChangesResult> {
  const admin = await requireAdminAction();
  const parsed = publishInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Demande de publication invalide." };
  const { lessonId, force } = parsed.data;
  const expectedUpdatedAt = new Date(parsed.data.expectedUpdatedAt);

  const draft = await lessonDraftRepository.get(lessonId);
  if (draft?.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
    return { ok: false, error: STUDIO_MESSAGES.draftConflict, conflict: "draft" };
  }

  const form = lessonPublishSchema.safeParse(lessonContentOf(draft));
  if (!form.success) {
    return {
      ok: false,
      error: STUDIO_MESSAGES.invalidForm,
      fieldErrors: publishFieldErrors(form.error),
    };
  }

  // Refused before it reaches the lesson: the editor used to save anything,
  // and on 22 September two saves in a row broke a lesson for everyone who
  // opened it (Sentry JAVASCRIPT-NEXTJS-14 and -15). The catalogue's rules,
  // which CI applied to content/ alone, are applied here too (authoring.ts).
  const { contentMdx, ...fields } = form.data;
  const check = asTyped(await checkLessonForSave(contentMdx.text), contentMdx.typed);
  if (!check.ok) {
    return {
      ok: false,
      error:
        check.kind === undefined ? "Le contenu ne s'affiche pas." : "Le contenu est à corriger.",
      fieldErrors: { contentMdx: describeLessonMdxProblem(check) },
      problems: editorProblemsOf(check),
    };
  }
  // From here the content passed: a refusal says so with an empty list, which
  // takes down what the editor marked.

  const [refCodeOwner, slugOwner] = await Promise.all([
    prisma.lesson.findFirst({
      where: { refCode: fields.refCode, NOT: { id: lessonId } },
      select: { id: true },
    }),
    prisma.lesson.findFirst({
      where: { slug: fields.slug, NOT: { id: lessonId } },
      select: { id: true },
    }),
  ]);
  if (refCodeOwner) {
    return {
      ok: false,
      error: STUDIO_MESSAGES.refCodeTaken,
      fieldErrors: { refCode: "Déjà utilisé" },
      problems: [],
    };
  }
  if (slugOwner) {
    return {
      ok: false,
      error: STUDIO_MESSAGES.slugTaken,
      fieldErrors: { slug: "Déjà utilisé" },
      problems: [],
    };
  }

  const content: LessonContent = { ...fields, contentMdx: contentMdx.text };
  const published = await lessonDraftRepository.publish(lessonId, content, {
    actorId: admin.id,
    expectedUpdatedAt,
    force: force === true,
  });
  if (!published.ok) {
    switch (published.reason) {
      case "draft_changed":
        return { ok: false, error: STUDIO_MESSAGES.draftConflict, conflict: "draft", problems: [] };
      case "lesson_changed":
        return {
          ok: false,
          error: STUDIO_MESSAGES.lessonChanged,
          conflict: "lesson",
          problems: [],
        };
      case "unchanged":
        revalidatePath(`/lessons/${lessonId}`);
        return {
          ok: false,
          error: STUDIO_MESSAGES.nothingToPublish,
          discarded: { content },
          problems: [],
        };
      case "taken":
        return published.field === "refCode"
          ? {
              ok: false,
              error: STUDIO_MESSAGES.refCodeTaken,
              fieldErrors: { refCode: "Déjà utilisé" },
              problems: [],
            }
          : {
              ok: false,
              error: STUDIO_MESSAGES.slugTaken,
              fieldErrors: { slug: "Déjà utilisé" },
              problems: [],
            };
      case "not_found":
        return { ok: false, error: STUDIO_MESSAGES.notFound, problems: [] };
      case "stale":
        return { ok: false, error: STUDIO_MESSAGES.stale, problems: [] };
    }
  }

  revalidatePath("/lessons");
  revalidatePath(`/lessons/${lessonId}`);
  return { ok: true, version: published.version, content: published.content };
}

const lessonInput = z.object({ lessonId: z.guid() });

export async function discardLessonDraftAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdminAction();
  const parsed = lessonInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Leçon invalide." };
  const { lessonId } = parsed.data;

  // Written down: a draft is work, and "who threw mine away" has an answer.
  if (await lessonDraftRepository.discard(lessonId)) {
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "lesson.draft.discard",
        targetType: "Lesson",
        targetId: lessonId,
        metadata: {},
      },
    });
  }
  revalidatePath(`/lessons/${lessonId}`);
  return { ok: true };
}

const restoreInput = z.object({ lessonId: z.guid(), versionId: z.guid() });

export type RestoreLessonVersionResult =
  | { ok: true; version: number; content: LessonContent }
  | { ok: false; error: string };

/** A version's content, for the studio to put in the draft: nothing is written here. */
export async function restoreLessonVersionAction(
  input: unknown,
): Promise<RestoreLessonVersionResult> {
  await requireAdminAction();
  const parsed = restoreInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Version invalide." };

  const found = await lessonVersionRepository.find(parsed.data.lessonId, parsed.data.versionId);
  if (found === null) return { ok: false, error: "Cette version n'existe plus." };
  return { ok: true, version: found.version, content: lessonContentOf(found) };
}
