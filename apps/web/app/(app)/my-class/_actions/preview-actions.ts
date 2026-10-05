"use server";

import { z } from "zod";
import { classRepository, LESSON_PREVIEW_TOKEN, lessonPreviewRepository } from "@cyberlearn/db";
import { checkLessonMdx, describeLessonMdxProblem } from "@cyberlearn/lib/mdx-check";
import { requireRequestUser } from "@/lib/auth";
import { unlocksEveryLesson } from "@/lib/lessons/access";

/**
 * The teacher's editor's preview: the draft goes to the lesson-preview table
 * and the page at /preview/<token> renders it, in the editor's frame. The
 * console has the same action for its own editor.
 *
 * For people who write lessons: a teacher of at least one class, or an
 * administrator. Anybody signed in could otherwise park text on the server
 * for half an hour, which is nobody's feature.
 */

const inputSchema = z.object({
  token: z.string().regex(LESSON_PREVIEW_TOKEN).nullable(),
  contentMdx: z.string().max(200_000),
});

export type LessonPreviewResult =
  | { ok: true; token: string; url: string }
  | { ok: false; error: string };

export async function refreshLessonPreviewAction(input: unknown): Promise<LessonPreviewResult> {
  const user = await requireRequestUser();

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Aperçu impossible : contenu invalide." };

  const [teaches, admin] = await Promise.all([
    classRepository.teachesAnyClass(user.id),
    unlocksEveryLesson(user.id),
  ]);
  if (!teaches && !admin) return { ok: false, error: "L'aperçu est réservé aux enseignants." };

  const render = await checkLessonMdx(parsed.data.contentMdx);
  if (!render.ok) return { ok: false, error: describeLessonMdxProblem(render) };

  const now = new Date();
  const { contentMdx } = parsed.data;
  let token = parsed.data.token;
  if (token === null || !(await lessonPreviewRepository.refresh(user.id, token, contentMdx, now))) {
    token = await lessonPreviewRepository.issue(user.id, contentMdx, now);
  }
  return { ok: true, token, url: `/preview/${token}` };
}
