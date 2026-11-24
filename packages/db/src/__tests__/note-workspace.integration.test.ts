/**
 * The notes workspace against the real DB: notes on no lesson, folders in
 * folders, the trash, imports and the cards taken from notes.
 *
 * Two halves. The repositories, which the site goes through (Prisma, RLS
 * bypassed): every write is scoped to its owner, and the rules a client cannot
 * be trusted with - no cycle in the tree, no lesson one may not open, the
 * trash giving a lesson's place up - hold even when the request is forged.
 * Then the Data API, which the app goes through as a signed-in user: the
 * policies keep the trash out of its reach and stop a row pointing at
 * somebody else's folder or note.
 *
 * Skips when DATABASE_URL (and, for the second half, the Supabase keys) are
 * absent, like the other integration specs. Rows are namespaced by a run
 * suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NOTE_FOLDER_MAX_DEPTH, NOTES_MAX } from "@cyberlearn/lib/notes/workspace";
import { prisma } from "../prisma.js";
import { noteCardRepository } from "../repositories/note-card.repository.js";
import { noteFolderRepository } from "../repositories/note-folder.repository.js";
import { noteImportRepository } from "../repositories/note-import.repository.js";
import { noteRepository } from "../repositories/note.repository.js";
import { purgeExpiredRecords, trashExpiry } from "../rgpd/retention.js";

const suffix = randomUUID().slice(0, 8);
const ME = randomUUID();
const OTHER = randomUUID();
const AUTHOR = randomUUID();
const lessonId = randomUUID();
const draftLessonId = randomUUID();

let configured = false;

async function lesson(id: string, status: "PUBLISHED" | "DRAFT", title: string): Promise<void> {
  await prisma.lesson.create({
    data: {
      id,
      refCode: `CL-LSN-${id.slice(0, 8)}`,
      slug: `ws-${id.slice(0, 8)}`,
      title,
      description: "x",
      category: "NETWORK",
      difficulty: "BEGINNER",
      estimatedMinutes: 5,
      xpReward: 0,
      contentMdx: "# x",
      authorId: AUTHOR,
      status,
      ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
    },
  });
}

describe("notes workspace (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;
    await prisma.user.createMany({
      data: [
        {
          id: ME,
          email: `ws-me-${suffix}@t.internal`,
          username: `wsme${suffix}`,
          displayName: "Moi",
        },
        {
          id: OTHER,
          email: `ws-o-${suffix}@t.internal`,
          username: `wso${suffix}`,
          displayName: "Autre",
        },
        {
          id: AUTHOR,
          email: `ws-a-${suffix}@t.internal`,
          username: `wsa${suffix}`,
          displayName: "Auteur",
          role: "ADMIN",
        },
      ],
    });
    await lesson(lessonId, "PUBLISHED", "Le modèle OSI");
    await lesson(draftLessonId, "DRAFT", "Brouillon");
    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.note.deleteMany({ where: { userId: { in: [ME, OTHER] } } });
    await prisma.noteFolder.deleteMany({ where: { userId: { in: [ME, OTHER] } } });
    await prisma.lesson.deleteMany({ where: { id: { in: [lessonId, draftLessonId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ME, OTHER, AUTHOR] } } });
  });

  describe("folders", () => {
    it("nests, refuses a cycle and the depth past the limit", async () => {
      if (!configured) return;
      const ids: string[] = [];
      let parentId: string | null = null;
      for (let depth = 1; depth <= NOTE_FOLDER_MAX_DEPTH; depth += 1) {
        const res = await noteFolderRepository.create(ME, {
          name: `L${String(depth)}`,
          color: null,
          icon: null,
          parentId,
        });
        expect(res.ok).toBe(true);
        if (!res.ok) return;
        ids.push(res.folder.id);
        parentId = res.folder.id;
      }
      const tooDeep = await noteFolderRepository.create(ME, {
        name: "trop",
        color: null,
        icon: null,
        parentId,
      });
      expect(tooDeep).toEqual({ ok: false, reason: "depth" });

      const [root, child, , leaf] = ids as [string, string, string, string];
      expect(await noteFolderRepository.move(ME, root, leaf)).toEqual({
        ok: false,
        reason: "cycle",
      });
      expect(await noteFolderRepository.move(ME, root, root)).toEqual({
        ok: false,
        reason: "self",
      });
      expect(await noteFolderRepository.move(ME, child, null)).toEqual({ ok: true });
    });

    it("never files under somebody else's folder, nor moves theirs", async () => {
      if (!configured) return;
      const theirs = await noteFolderRepository.create(OTHER, {
        name: "À eux",
        color: null,
        icon: null,
        parentId: null,
      });
      if (!theirs.ok) throw new Error("setup");
      const mine = await noteFolderRepository.create(ME, {
        name: "À moi",
        color: null,
        icon: null,
        parentId: null,
      });
      if (!mine.ok) throw new Error("setup");

      expect(
        await noteFolderRepository.create(ME, {
          name: "x",
          color: null,
          icon: null,
          parentId: theirs.folder.id,
        }),
      ).toEqual({ ok: false, reason: "parent" });
      expect(await noteFolderRepository.move(ME, mine.folder.id, theirs.folder.id)).toEqual({
        ok: false,
        reason: "not-found",
      });
      expect(await noteFolderRepository.move(ME, theirs.folder.id, null)).toEqual({
        ok: false,
        reason: "not-found",
      });
      expect(await noteFolderRepository.remove(ME, theirs.folder.id, "trash")).toBeNull();
      const created = await noteRepository.create(ME, {
        title: "n",
        content: "",
        wordCount: 0,
        folderId: theirs.folder.id,
      });
      expect(created).toEqual({ ok: false, reason: "folder" });
    });

    it("lifts what a deleted folder holds to its parent", async () => {
      if (!configured) return;
      const top = await noteFolderRepository.create(ME, {
        name: "Haut",
        color: null,
        icon: null,
        parentId: null,
      });
      if (!top.ok) throw new Error("setup");
      const mid = await noteFolderRepository.create(ME, {
        name: "Milieu",
        color: null,
        icon: null,
        parentId: top.folder.id,
      });
      if (!mid.ok) throw new Error("setup");
      const sub = await noteFolderRepository.create(ME, {
        name: "Bas",
        color: null,
        icon: null,
        parentId: mid.folder.id,
      });
      if (!sub.ok) throw new Error("setup");
      const note = await noteRepository.create(ME, {
        title: "dedans",
        content: "x",
        wordCount: 1,
        folderId: mid.folder.id,
      });
      if (!note.ok) throw new Error("setup");

      expect(await noteFolderRepository.remove(ME, mid.folder.id, "lift")).toEqual({ trashed: 0 });
      const after = await prisma.noteFolder.findUnique({
        where: { id: sub.folder.id },
        select: { parentId: true },
      });
      expect(after?.parentId).toBe(top.folder.id);
      const moved = await prisma.note.findUnique({
        where: { id: note.note.id },
        select: { folderId: true, deletedAt: true },
      });
      expect(moved).toEqual({ folderId: top.folder.id, deletedAt: null });
    });
  });

  describe("lessons", () => {
    it("ties a note only to a lesson the user may open", async () => {
      if (!configured) return;
      const draft = await noteRepository.create(ME, {
        title: "n",
        content: "",
        wordCount: 0,
        folderId: null,
        lessonId: draftLessonId,
      });
      expect(draft).toEqual({ ok: false, reason: "lesson" });

      const free = await noteRepository.create(ME, {
        title: "libre",
        content: "a",
        wordCount: 1,
        folderId: null,
      });
      if (!free.ok) throw new Error("setup");
      expect(
        await noteRepository.attachToLesson(ME, free.note.id, draftLessonId, "attach"),
      ).toEqual({
        status: "not-found",
      });
      expect(await noteRepository.attachToLesson(OTHER, free.note.id, lessonId, "attach")).toEqual({
        status: "not-found",
      });
      expect(await noteRepository.attachToLesson(ME, free.note.id, lessonId, "attach")).toEqual({
        status: "attached",
        noteId: free.note.id,
      });
    });

    it("merges into the lesson's note rather than giving it two", async () => {
      if (!configured) return;
      const second = await noteRepository.create(ME, {
        title: "Deuxième",
        content: "b",
        wordCount: 1,
        folderId: null,
      });
      if (!second.ok) throw new Error("setup");
      const conflict = await noteRepository.attachToLesson(ME, second.note.id, lessonId, "attach");
      expect(conflict.status).toBe("conflict");

      const merged = await noteRepository.attachToLesson(ME, second.note.id, lessonId, "merge");
      expect(merged.status).toBe("merged");
      const lessonNote = await noteRepository.findForLesson(ME, lessonId);
      expect(lessonNote?.content).toContain("## Deuxième");
      const gone = await prisma.note.findUnique({
        where: { id: second.note.id },
        select: { deletedAt: true },
      });
      expect(gone?.deletedAt).not.toBeNull();
    });
  });

  describe("trash", () => {
    it("gives the lesson's place up, and takes it back on restore when free", async () => {
      if (!configured) return;
      const onLesson = await noteRepository.findForLesson(ME, lessonId);
      if (!onLesson) throw new Error("setup");
      expect(await noteRepository.trash(OTHER, [onLesson.id])).toBe(0);
      expect(await noteRepository.trash(ME, [onLesson.id])).toBe(1);
      expect(await noteRepository.findForLesson(ME, lessonId)).toBeNull();

      const restored = await noteRepository.restore(ME, [onLesson.id]);
      expect(restored).toEqual({ restored: [onLesson.id], freed: [] });
      expect((await noteRepository.findForLesson(ME, lessonId))?.id).toBe(onLesson.id);

      // Trashed again, and a new note written on the lesson meanwhile: it comes back free.
      await noteRepository.trash(ME, [onLesson.id]);
      const fresh = await noteRepository.upsert(ME, lessonId, "nouvelle", 1);
      expect(fresh).not.toBeNull();
      expect(await noteRepository.restore(ME, [onLesson.id])).toEqual({
        restored: [onLesson.id],
        freed: [onLesson.id],
      });
    });

    it("purges only what is in the trash, only the owner's, and the expired ones daily", async () => {
      if (!configured) return;
      const live = await noteRepository.create(ME, {
        title: "vivante",
        content: "x",
        wordCount: 1,
        folderId: null,
      });
      if (!live.ok) throw new Error("setup");
      expect(await noteRepository.purge(ME, [live.note.id])).toBe(0);
      await noteRepository.trash(ME, [live.note.id]);
      expect(await noteRepository.purge(OTHER, [live.note.id])).toBe(0);

      // Thrown away long enough ago: the retention job takes it.
      await prisma.note.update({
        where: { id: live.note.id },
        data: { deletedAt: new Date(trashExpiry(new Date()).getTime() - 60_000) },
      });
      const summary = await purgeExpiredRecords(new Date());
      expect(summary.trashedNotes).toBeGreaterThanOrEqual(1);
      expect(await prisma.note.findUnique({ where: { id: live.note.id } })).toBeNull();
    });
  });

  describe("import", () => {
    it("rebuilds the folders, reuses those that exist, and refuses a foreign target", async () => {
      if (!configured) return;
      const item = (folders: string[], title: string) => ({
        folders,
        title,
        content: "x",
        wordCount: 1,
      });
      const first = await noteImportRepository.importBatch(ME, null, [
        item(["Importé", "Sous"], "a"),
        item(["Importé"], "b"),
      ]);
      expect(first).toEqual({ ok: true, created: 2, foldersCreated: 2, flattened: 0 });
      const again = await noteImportRepository.importBatch(ME, null, [
        item(["importé", "sous"], "c"),
      ]);
      expect(again).toEqual({ ok: true, created: 1, foldersCreated: 0, flattened: 0 });

      const theirs = await noteFolderRepository.create(OTHER, {
        name: "cible",
        color: null,
        icon: null,
        parentId: null,
      });
      if (!theirs.ok) throw new Error("setup");
      expect(await noteImportRepository.importBatch(ME, theirs.folder.id, [item([], "d")])).toEqual(
        {
          ok: false,
          reason: "folder",
        },
      );
    });

    it("cuts a path deeper than the limit, and refuses past the account's cap", async () => {
      if (!configured) return;
      const deep = Array.from({ length: NOTE_FOLDER_MAX_DEPTH + 2 }, (_, i) => `P${String(i)}`);
      const res = await noteImportRepository.importBatch(ME, null, [
        { folders: deep, title: "profond", content: "x", wordCount: 1 },
      ]);
      expect(res).toMatchObject({ ok: true, flattened: 1 });

      const tooMany = Array.from({ length: NOTES_MAX + 1 }, (_, i) => ({
        folders: [],
        title: `n${String(i)}`,
        content: "",
        wordCount: 0,
      }));
      expect(await noteImportRepository.importBatch(ME, null, tooMany)).toEqual({
        ok: false,
        reason: "limit",
      });
    });
  });

  describe("cards", () => {
    it("syncs a note's deck by question, and answers only the owner's cards", async () => {
      if (!configured) return;
      const note = await noteRepository.create(ME, {
        title: "cartes",
        content: "Q :: R",
        wordCount: 2,
        folderId: null,
      });
      if (!note.ok) throw new Error("setup");
      const now = new Date();
      expect(
        await noteCardRepository.syncForNote(
          OTHER,
          note.note.id,
          [{ key: "k1", front: "Q", back: "R" }],
          now,
        ),
      ).toBeNull();
      expect(
        await noteCardRepository.syncForNote(
          ME,
          note.note.id,
          [{ key: "k1", front: "Q", back: "R" }],
          now,
        ),
      ).toEqual({ added: 1, updated: 0, removed: 0 });
      expect(
        await noteCardRepository.syncForNote(
          ME,
          note.note.id,
          [{ key: "k1", front: "Q", back: "R2" }],
          now,
        ),
      ).toEqual({ added: 0, updated: 1, removed: 0 });

      const [card] = await noteCardRepository.findDue(ME, now, 10, [note.note.id]);
      if (!card) throw new Error("no due card");
      expect(await noteCardRepository.answer(OTHER, card.id, true, now)).toBeNull();
      expect(await noteCardRepository.answer(ME, card.id, true, now)).toMatchObject({
        box: 2,
        retired: false,
      });

      // A note in the trash takes its cards out of review.
      await noteRepository.trash(ME, [note.note.id]);
      await prisma.noteCard.update({ where: { id: card.id }, data: { dueAt: new Date(0) } });
      expect(await noteCardRepository.findDue(ME, now, 10, [note.note.id])).toEqual([]);
    });
  });
});

/**
 * The Data API, as the app reaches it: a signed-in user, the policies doing
 * the work. Needs the Supabase keys of the local stack.
 */
describe("notes workspace policies (integration, Data API)", () => {
  const EMAIL_A = `ws-rls-a-${suffix}@test.cyberlearn.internal`;
  const EMAIL_B = `ws-rls-b-${suffix}@test.cyberlearn.internal`;
  const PASSWORD = "TestPassword123!";
  let admin: SupabaseClient;
  let a: SupabaseClient;
  let userA = "";
  let userB = "";
  let ready = false;

  async function signIn(url: string, anon: string, email: string): Promise<SupabaseClient> {
    const signer = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await signer.auth.signInWithPassword({ email, password: PASSWORD });
    if (error || !data.session)
      throw new Error(`Sign in failed: ${error?.message ?? "no session"}`);
    return createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
  }

  beforeAll(async () => {
    const url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
    const anon = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
    const service = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
    if (!url || !anon || !service || !process.env["DATABASE_URL"]) return;
    admin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const ids: string[] = [];
    for (const email of [EMAIL_A, EMAIL_B]) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
      ids.push(data.user.id);
    }
    [userA, userB] = ids as [string, string];
    await prisma.user.createMany({
      data: [
        { id: userA, email: EMAIL_A, username: `wsra${suffix}`, displayName: "A" },
        { id: userB, email: EMAIL_B, username: `wsrb${suffix}`, displayName: "B" },
      ],
    });
    a = await signIn(url, anon, EMAIL_A);
    ready = true;
  });

  afterAll(async () => {
    if (!ready) return;
    await prisma.note.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.noteFolder.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
    for (const id of [userA, userB]) await admin.auth.admin.deleteUser(id);
  });

  it("does not show a note in the trash, nor let it be edited", async () => {
    if (!ready) return;
    const live = await prisma.note.create({
      data: { userId: userA, title: "vivante", content: "x" },
    });
    const trashed = await prisma.note.create({
      data: { userId: userA, title: "jetée", content: "x", deletedAt: new Date() },
    });
    const { data } = await a.from("notes").select("id").in("id", [live.id, trashed.id]);
    expect((data ?? []).map((r: { id: string }) => r.id)).toEqual([live.id]);

    await a.from("notes").update({ content: "écrasée" }).eq("id", trashed.id);
    const after = await prisma.note.findUnique({
      where: { id: trashed.id },
      select: { content: true },
    });
    expect(after?.content).toBe("x");
  });

  it("refuses a note filed in somebody else's folder", async () => {
    if (!ready) return;
    // The same insert into one's own folder goes through: what refuses the
    // next one is the folder's owner, not the request.
    const own = await prisma.noteFolder.create({ data: { userId: userA, name: "à A" } });
    const ok = await a.from("notes").insert({
      id: randomUUID(),
      userId: userA,
      folderId: own.id,
      content: "x",
      updatedAt: new Date().toISOString(),
    });
    expect(ok.error).toBeNull();

    const theirs = await prisma.noteFolder.create({ data: { userId: userB, name: "à B" } });
    const { error } = await a.from("notes").insert({
      id: randomUUID(),
      userId: userA,
      folderId: theirs.id,
      content: "x",
      updatedAt: new Date().toISOString(),
    });
    expect(error).not.toBeNull();

    const mine = await prisma.note.create({
      data: { userId: userA, title: "à moi", content: "x" },
    });
    await a.from("notes").update({ folderId: theirs.id }).eq("id", mine.id);
    const after = await prisma.note.findUnique({
      where: { id: mine.id },
      select: { folderId: true },
    });
    expect(after?.folderId).toBeNull();
  });

  it("refuses a folder whose parent is somebody else's", async () => {
    if (!ready) return;
    const ownParent = await prisma.noteFolder.create({
      data: { userId: userA, name: "parent de A" },
    });
    const ok = await a.from("note_folders").insert({
      id: randomUUID(),
      userId: userA,
      name: "enfant",
      parentId: ownParent.id,
      updatedAt: new Date().toISOString(),
    });
    expect(ok.error).toBeNull();

    const theirs = await prisma.noteFolder.create({ data: { userId: userB, name: "parent de B" } });
    const { error } = await a.from("note_folders").insert({
      id: randomUUID(),
      userId: userA,
      name: "enfant",
      parentId: theirs.id,
      updatedAt: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
  });

  it("refuses a card on somebody else's note, and hides theirs", async () => {
    if (!ready) return;
    const myNote = await prisma.note.create({
      data: { userId: userA, title: "A", content: "Q :: R" },
    });
    const ok = await a.from("note_cards").insert({
      id: randomUUID(),
      userId: userA,
      noteId: myNote.id,
      key: "k",
      front: "Q",
      back: "R",
      dueAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(ok.error).toBeNull();

    const theirNote = await prisma.note.create({
      data: { userId: userB, title: "B", content: "Q :: R" },
    });
    const { error } = await a.from("note_cards").insert({
      id: randomUUID(),
      userId: userA,
      noteId: theirNote.id,
      key: "k",
      front: "Q",
      back: "R",
      dueAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(error).not.toBeNull();

    await prisma.noteCard.create({
      data: {
        userId: userB,
        noteId: theirNote.id,
        key: "k",
        front: "Q",
        back: "R",
        dueAt: new Date(),
      },
    });
    const { data } = await a.from("note_cards").select("id").eq("noteId", theirNote.id);
    expect(data).toEqual([]);
  });
});
