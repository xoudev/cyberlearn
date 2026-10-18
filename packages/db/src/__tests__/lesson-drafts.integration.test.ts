/**
 * The lesson studio's tables on a real database: the draft an administrator
 * writes and the versions each publish keeps.
 *
 * Two things are held here. The repository's conditional writes, which only
 * Postgres can prove: a second tab cannot save over the first, a publish bumps
 * lessons.version and keeps both what the lesson held and what it now holds.
 * And the Data API: neither table is reachable by a client role, signed in or
 * not, since a draft is what has not been published yet. The site and the app
 * read lessons.contentMdx, which is why the draft has a table of its own.
 *
 * Runs against the local Supabase stack CI starts; skips without it.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "../prisma.js";
import { lessonDraftRepository } from "../repositories/lesson-draft.repository.js";
import type { LessonContent } from "../repositories/lesson-version.repository.js";

const suffix = randomUUID().slice(0, 8);
const EMAIL = `lesson-drafts-${suffix}@test.cyberlearn.internal`;
const PASSWORD = "TestPassword123!";
const adminId = randomUUID();

const PUBLISHED: LessonContent = {
  refCode: `DRF-${suffix}-V01`,
  slug: `brouillon-${suffix}`,
  title: "Une leçon publiée",
  description: "Ce que les apprenants lisent pendant que la console écrit.",
  category: "NETWORK",
  difficulty: "BEGINNER",
  estimatedMinutes: 10,
  xpReward: 20,
  contentMdx: "## Publiée\n\nCe que tout le monde lit.",
  coverImageUrl: null,
};

const DRAFTED: LessonContent = {
  ...PUBLISHED,
  title: "Une leçon réécrite",
  contentMdx: "## Réécrite\n\nCe que personne ne lit encore.",
};

describe("lesson drafts and versions (integration)", () => {
  let url = "";
  let anonKey = "";
  let supabase: SupabaseClient;
  let configured = false;
  let studentId = "";
  let lessonId = "";

  async function signIn(): Promise<SupabaseClient> {
    const signer = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await signer.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    });
    if (error || !data.session) throw new Error(`Sign in failed: ${error?.message}`);
    return createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
  }

  beforeAll(async () => {
    url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
    anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
    const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
    if (!process.env["DATABASE_URL"] || !url || !anonKey || !serviceKey) return;

    supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`user: ${error?.message}`);
    studentId = data.user.id;

    await prisma.user.createMany({
      data: [
        { id: studentId, email: EMAIL, displayName: "Apprenant curieux" },
        {
          id: adminId,
          email: `admin-${suffix}@test.cyberlearn.internal`,
          displayName: "Admin du studio",
          role: "ADMIN",
        },
      ],
    });
    const lesson = await prisma.lesson.create({
      data: { ...PUBLISHED, status: "PUBLISHED", publishedAt: new Date() },
      select: { id: true },
    });
    lessonId = lesson.id;
    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
    await prisma.user.deleteMany({ where: { id: { in: [studentId, adminId] } } });
    await supabase.auth.admin.deleteUser(studentId);
  });

  it("refuses a save over a draft the editor did not see", async () => {
    if (!configured) return;
    const first = await lessonDraftRepository.save(lessonId, DRAFTED, {
      actorId: adminId,
      expectedUpdatedAt: null,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    // A second tab that opened the lesson before the draft existed.
    const late = await lessonDraftRepository.save(lessonId, PUBLISHED, {
      actorId: adminId,
      expectedUpdatedAt: null,
    });
    expect(late).toEqual({ ok: false, reason: "conflict" });
    // One that saw an older draft.
    const stale = await lessonDraftRepository.save(lessonId, PUBLISHED, {
      actorId: adminId,
      expectedUpdatedAt: new Date(first.updatedAt.getTime() - 1000),
    });
    expect(stale).toEqual({ ok: false, reason: "conflict" });

    const draft = await lessonDraftRepository.get(lessonId);
    expect(draft?.title).toBe(DRAFTED.title);
    // The learners still read what was published.
    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
    expect(lesson.contentMdx).toBe(PUBLISHED.contentMdx);
  });

  it("keeps the draft out of every client role's reach", async () => {
    if (!configured) return;
    const anon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const student = await signIn();
    for (const client of [anon, student]) {
      for (const table of ["lesson_drafts", "lesson_versions"]) {
        const { data, error } = await client.from(table).select("*").eq("lessonId", lessonId);
        // Refused outright (no privilege) or filtered to nothing: never a row.
        expect(error !== null || (data ?? []).length === 0).toBe(true);
      }
    }
    const { error } = await student
      .from("lesson_drafts")
      .update({ title: "Forgé" })
      .eq("lessonId", lessonId);
    expect(error).not.toBeNull();
    const draft = await lessonDraftRepository.get(lessonId);
    expect(draft?.title).toBe(DRAFTED.title);
  });

  it("publishes the draft: a new version, the old one kept, the draft gone", async () => {
    if (!configured) return;
    const draft = await prisma.lessonDraft.findUniqueOrThrow({ where: { lessonId } });
    const result = await lessonDraftRepository.publish(lessonId, DRAFTED, {
      actorId: adminId,
      expectedUpdatedAt: draft.updatedAt,
    });
    expect(result).toMatchObject({ ok: true, version: 2 });

    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
    expect(lesson.version).toBe(2);
    expect(lesson.contentMdx).toBe(DRAFTED.contentMdx);
    expect(await prisma.lessonDraft.count({ where: { lessonId } })).toBe(0);

    const versions = await prisma.lessonVersion.findMany({
      where: { lessonId },
      orderBy: { version: "asc" },
      select: { version: true, source: true, contentMdx: true, publishedById: true },
    });
    expect(versions).toEqual([
      { version: 1, source: "BASELINE", contentMdx: PUBLISHED.contentMdx, publishedById: null },
      { version: 2, source: "CONSOLE", contentMdx: DRAFTED.contentMdx, publishedById: adminId },
    ]);
  });

  it("asks before publishing over a lesson that changed under the draft", async () => {
    if (!configured) return;
    const again: LessonContent = { ...DRAFTED, title: "Encore une fois" };
    const saved = await lessonDraftRepository.save(lessonId, again, {
      actorId: adminId,
      expectedUpdatedAt: null,
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    // Something else writes the lesson's content meanwhile (a sync, say).
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { description: "Réécrite par la synchronisation avec le dépôt." },
    });

    const refused = await lessonDraftRepository.publish(lessonId, again, {
      actorId: adminId,
      expectedUpdatedAt: saved.updatedAt,
    });
    expect(refused).toEqual({ ok: false, reason: "lesson_changed" });

    const forced = await lessonDraftRepository.publish(lessonId, again, {
      actorId: adminId,
      expectedUpdatedAt: saved.updatedAt,
      force: true,
    });
    expect(forced).toMatchObject({ ok: true, version: 3 });
  });

  it("goes with its lesson, and keeps the history when its author's account goes", async () => {
    if (!configured) return;
    await prisma.user.delete({ where: { id: adminId } });
    const kept = await prisma.lessonVersion.findMany({
      where: { lessonId },
      select: { publishedById: true },
    });
    expect(kept.length).toBe(3);
    expect(kept.every((v) => v.publishedById === null)).toBe(true);

    await prisma.lesson.delete({ where: { id: lessonId } });
    expect(await prisma.lessonVersion.count({ where: { lessonId } })).toBe(0);
    expect(await prisma.lessonDraft.count({ where: { lessonId } })).toBe(0);
  });
});
