/**
 * The lesson studio's tables on a real database: the draft an administrator
 * writes and the versions each publish keeps.
 *
 * Two things are held here. The repository's conditional writes, which only
 * Postgres can prove: a second tab cannot save over the first, a publish bumps
 * lessons.version and keeps both what the lesson held and what it now holds,
 * and so does a file written over a lesson by the import or the sync, with a
 * single audit row, leaving a studio draft as it was.
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
import { lessonFileRepository } from "../repositories/lesson-file.repository.js";
import {
  lessonBaseOf,
  lessonContentOf,
  lessonVersionRepository,
  type LessonContent,
} from "../repositories/lesson-version.repository.js";

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
    const base = lessonBaseOf({ ...PUBLISHED, version: 1 });
    const first = await lessonDraftRepository.save(lessonId, DRAFTED, {
      actorId: adminId,
      expectedUpdatedAt: null,
      base,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    // A second tab that opened the lesson before the draft existed.
    const late = await lessonDraftRepository.save(lessonId, PUBLISHED, {
      actorId: adminId,
      expectedUpdatedAt: null,
      base,
    });
    expect(late).toEqual({ ok: false, reason: "conflict" });
    // One that saw an older draft.
    const stale = await lessonDraftRepository.save(lessonId, PUBLISHED, {
      actorId: adminId,
      expectedUpdatedAt: new Date(first.updatedAt.getTime() - 1000),
      base,
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
      base: lessonBaseOf({ ...DRAFTED, version: 2 }),
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

  it("asks too when the lesson changed between the page load and the first save", async () => {
    if (!configured) return;
    // The studio loads the lesson, with no draft.
    const loaded = await lessonVersionRepository.current(lessonId);
    if (loaded === null) throw new Error("lesson gone");
    // A sync rewrites the lesson before the first keystroke.
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { title: "Retitrée par la synchronisation" },
    });
    // The first save carries the fields as the studio loaded them, plus the edit.
    const edited: LessonContent = {
      ...lessonContentOf(loaded),
      contentMdx: `${loaded.contentMdx}\n\nAjout.`,
    };
    const saved = await lessonDraftRepository.save(lessonId, edited, {
      actorId: adminId,
      expectedUpdatedAt: null,
      base: lessonBaseOf(loaded),
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;

    const refused = await lessonDraftRepository.publish(lessonId, edited, {
      actorId: adminId,
      expectedUpdatedAt: saved.updatedAt,
    });
    expect(refused).toEqual({ ok: false, reason: "lesson_changed" });
    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
    expect(lesson.title).toBe("Retitrée par la synchronisation");
    await lessonDraftRepository.discard(lessonId);
  });

  it("creates an imported lesson with its first version and its one audit row", async () => {
    if (!configured) return;
    const fresh: LessonContent = {
      ...PUBLISHED,
      refCode: `DRF-${suffix}-V02`,
      slug: `importee-${suffix}`,
      title: "Une leçon importée",
    };
    const result = await lessonFileRepository.createFromFile({
      fields: fresh,
      actorId: adminId,
      prerequisiteRefCodes: [],
      auditMetadata: { refCode: fresh.refCode, file: "importee.mdx" },
    });
    expect(result).toMatchObject({ refCode: fresh.refCode, version: 1 });
    try {
      const created = await prisma.lesson.findUniqueOrThrow({
        where: { id: result.lessonId },
        select: { version: true, status: true, authorId: true },
      });
      expect(created).toEqual({ version: 1, status: "DRAFT", authorId: adminId });
      const versions = await prisma.lessonVersion.findMany({
        where: { lessonId: result.lessonId },
        select: { version: true, source: true, title: true, publishedById: true },
      });
      expect(versions).toEqual([
        { version: 1, source: "IMPORT", title: fresh.title, publishedById: adminId },
      ]);
      const audit = await prisma.auditLog.findMany({
        where: { targetId: result.lessonId },
        select: { action: true, metadata: true },
      });
      expect(audit).toEqual([
        {
          action: "lesson.import.success",
          metadata: { refCode: fresh.refCode, file: "importee.mdx", version: 1 },
        },
      ]);
    } finally {
      await prisma.auditLog.deleteMany({ where: { targetId: result.lessonId } });
      await prisma.lesson.delete({ where: { id: result.lessonId } });
    }
  });

  describe("a file written over a lesson", () => {
    /** A lesson of its own for each case, at version 1 with nothing recorded, as before the studio. */
    async function lessonFromFile(tag: string): Promise<{ id: string; updatedAt: Date }> {
      return prisma.lesson.create({
        data: {
          ...PUBLISHED,
          refCode: `DRF-${suffix}-${tag}`,
          slug: `fichier-${tag.toLowerCase()}-${suffix}`,
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
        select: { id: true, updatedAt: true },
      });
    }

    const FROM_FILE = {
      contentMdx: "## Corrigée\n\nCe que le fichier dit maintenant.",
      title: "Une leçon corrigée par son fichier",
      description: PUBLISHED.description,
      category: PUBLISHED.category,
      difficulty: PUBLISHED.difficulty,
      estimatedMinutes: PUBLISHED.estimatedMinutes,
      xpReward: PUBLISHED.xpReward,
    };

    async function trace(id: string): Promise<{
      version: number;
      versions: { version: number; source: string }[];
      audit: { action: string; metadata: unknown }[];
    }> {
      const [lesson, versions, audit] = await Promise.all([
        prisma.lesson.findUniqueOrThrow({ where: { id }, select: { version: true } }),
        prisma.lessonVersion.findMany({
          where: { lessonId: id },
          orderBy: { version: "asc" },
          select: { version: true, source: true },
        }),
        prisma.auditLog.findMany({
          where: { targetId: id },
          select: { action: true, metadata: true },
        }),
      ]);
      return { version: lesson.version, versions, audit };
    }

    async function remove(id: string): Promise<void> {
      await prisma.auditLog.deleteMany({ where: { targetId: id } });
      await prisma.lesson.delete({ where: { id } });
    }

    it("from the import page: one version from the import, one audit row", async () => {
      if (!configured) return;
      const lesson = await lessonFromFile("IMP");
      try {
        const written = await lessonFileRepository.writeFromFile({
          lessonId: lesson.id,
          expectedUpdatedAt: lesson.updatedAt,
          fields: FROM_FILE,
          prerequisiteIds: [],
          audit: { actorId: adminId, action: "lesson.import.update", metadata: { file: "a.mdx" } },
        });
        expect(written).toEqual({ ok: true, version: 2, draftKept: false });
        expect(await trace(lesson.id)).toEqual({
          version: 2,
          // What the lesson held before is kept too, as the studio's first publish keeps it.
          versions: [
            { version: 1, source: "BASELINE" },
            { version: 2, source: "IMPORT" },
          ],
          audit: [{ action: "lesson.import.update", metadata: { file: "a.mdx", version: 2 } }],
        });

        // The same diff confirmed again, from a tab that still shows it: refused.
        const again = await lessonFileRepository.writeFromFile({
          lessonId: lesson.id,
          expectedUpdatedAt: lesson.updatedAt,
          fields: { ...FROM_FILE, title: "Une autre correction" },
          prerequisiteIds: [],
          audit: { actorId: adminId, action: "lesson.import.update", metadata: { file: "a.mdx" } },
        });
        expect(again).toEqual({ ok: false });
        expect((await trace(lesson.id)).versions).toHaveLength(2);
      } finally {
        await remove(lesson.id);
      }
    });

    it("from the repository: one version from the sync, one audit row, the studio draft kept", async () => {
      if (!configured) return;
      const lesson = await lessonFromFile("SYN");
      try {
        const loaded = await lessonVersionRepository.current(lesson.id);
        if (loaded === null) throw new Error("lesson gone");
        const base = lessonBaseOf(loaded);
        const draft: LessonContent = { ...lessonContentOf(loaded), title: "Écrite au studio" };
        const saved = await lessonDraftRepository.save(lesson.id, draft, {
          actorId: adminId,
          expectedUpdatedAt: null,
          base,
        });
        if (!saved.ok) throw new Error("draft not saved");

        const written = await lessonFileRepository.writeFromFile({
          lessonId: lesson.id,
          expectedUpdatedAt: lesson.updatedAt,
          fields: FROM_FILE,
          prerequisiteIds: [],
          audit: { actorId: adminId, action: "lesson.sync", metadata: { file: "b.mdx" } },
        });
        expect(written).toEqual({ ok: true, version: 2, draftKept: true });
        expect(await trace(lesson.id)).toEqual({
          version: 2,
          versions: [
            { version: 1, source: "BASELINE" },
            { version: 2, source: "SYNC" },
          ],
          audit: [{ action: "lesson.sync", metadata: { file: "b.mdx", version: 2 } }],
        });

        // The draft is there as it was, on a base the lesson has moved from:
        // its publish asks before replacing what the file wrote.
        const kept = await lessonDraftRepository.get(lesson.id);
        expect(kept).toMatchObject({ title: draft.title, baseContentHash: base.contentHash });
        const refused = await lessonDraftRepository.publish(lesson.id, draft, {
          actorId: adminId,
          expectedUpdatedAt: saved.updatedAt,
        });
        expect(refused).toEqual({ ok: false, reason: "lesson_changed" });
      } finally {
        await remove(lesson.id);
      }
    });
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
