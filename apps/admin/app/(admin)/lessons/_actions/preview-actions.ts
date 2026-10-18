"use server";

import { z } from "zod";
import { LESSON_PREVIEW_TOKEN, lessonPreviewRepository } from "@cyberlearn/db";
import { checkLessonForSave } from "@cyberlearn/lib/mdx-authoring";
import {
  describeLessonMdxProblem,
  editorProblemsOf,
  type LessonEditorProblem,
} from "@cyberlearn/lib/mdx-check";
import { requireAdminAction } from "@/lib/auth";
import { learnerUrl } from "@/lib/learner-url";

/**
 * The editor's preview: the draft goes to the site, which renders it at the
 * address returned, in the editor's frame. See lesson-preview.repository.ts
 * for the token and apps/web/app/preview for the page.
 *
 * The draft is checked before it is stored, with the check the save runs: a
 * draft that does not render would show a "section indisponible" notice and
 * report to Sentry, when what the author needs is the line that is wrong. A
 * draft that renders but breaks a rule of the catalogue (an em dash, say) is
 * shown, and its problems come back with the address, for the editor to mark
 * before the save refuses them.
 */

const inputSchema = z.object({
  /** The token of the preview this editor already has, to refresh it in place. */
  token: z.string().regex(LESSON_PREVIEW_TOKEN).nullable(),
  contentMdx: z.string().max(200_000),
});

export type LessonPreviewResult =
  | { ok: true; token: string; url: string; problems: LessonEditorProblem[] }
  | { ok: false; error: string; problems?: LessonEditorProblem[] };

export async function refreshLessonPreviewAction(input: unknown): Promise<LessonPreviewResult> {
  const admin = await requireAdminAction();

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Aperçu impossible : contenu invalide." };

  const check = await checkLessonForSave(parsed.data.contentMdx);
  const problems = editorProblemsOf(check);
  // The gravest problem comes first: absent a kind, the draft does not render.
  if (!check.ok && check.kind === undefined) {
    return { ok: false, error: describeLessonMdxProblem(check), problems };
  }

  const now = new Date();
  const { contentMdx } = parsed.data;
  let token = parsed.data.token;
  if (
    token === null ||
    !(await lessonPreviewRepository.refresh(admin.id, token, contentMdx, now))
  ) {
    token = await lessonPreviewRepository.issue(admin.id, contentMdx, now);
  }
  return { ok: true, token, url: learnerUrl(`/preview/${token}`), problems };
}
