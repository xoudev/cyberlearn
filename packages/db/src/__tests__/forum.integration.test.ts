/**
 * The forum, against the real DB.
 *
 * What is checked here is what a forum gets wrong when nobody looks: the order
 * of a section (a pinned thread that sinks is a pinned thread for nothing), the
 * counters every list reads, who is told about a reply, and what a removal
 * actually removes.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterEach, afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { forumRepository, slugify } from "../repositories/forum.repository.js";

const suffix = randomUUID().slice(0, 8);
const A = randomUUID(); // opens threads
const B = randomUUID(); // replies
const C = randomUUID(); // reads
const ADMIN = randomUUID();
const everyone = [A, B, C, ADMIN];

const catA = randomUUID();
const catB = randomUUID();

let configured = false;

/**
 * A fixture that did not get created is a bug in the test, not a case to
 * tolerate with `?.` - an optional chain there quietly turns the assertion
 * that follows into one about undefined.
 */
function need<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("fixture manquante");
  return value;
}

async function wipeTopics(): Promise<void> {
  await prisma.forumTopic.deleteMany({ where: { categoryId: { in: [catA, catB] } } });
}

describe("forum (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;
    await prisma.user.createMany({
      data: [
        { id: A, email: `fa-${suffix}@t.internal`, username: `fa${suffix}`, displayName: "Awa" },
        { id: B, email: `fb-${suffix}@t.internal`, username: `fb${suffix}`, displayName: "Bilal" },
        { id: C, email: `fc-${suffix}@t.internal`, username: `fc${suffix}`, displayName: "Chloé" },
        {
          id: ADMIN,
          email: `fd-${suffix}@t.internal`,
          username: `fd${suffix}`,
          displayName: "Admin",
          role: "ADMIN",
        },
      ],
    });
    await prisma.forumCategory.createMany({
      data: [
        {
          id: catA,
          slug: `test-a-${suffix}`,
          name: "Test A",
          description: "A",
          accent: "#0AFFD4",
          position: 90,
        },
        {
          id: catB,
          slug: `test-b-${suffix}`,
          name: "Test B",
          description: "B",
          accent: "#FF4757",
          position: 91,
        },
      ],
    });
    configured = true;
  });

  afterEach(async () => {
    if (!configured) return;
    await wipeTopics();
    await prisma.notification.deleteMany({ where: { userId: { in: everyone } } });
  });

  afterAll(async () => {
    if (!configured) return;
    await wipeTopics();
    await prisma.forumCategory.deleteMany({ where: { id: { in: [catA, catB] } } });
    await prisma.notification.deleteMany({ where: { userId: { in: everyone } } });
    await prisma.user.deleteMany({ where: { id: { in: everyone } } });
  });

  // ─── Addresses ───────────────────────────────────────────────────────────

  it("folds accents into the slug rather than dropping the letters", () => {
    expect(slugify("Réseaux & protocoles")).toBe("reseaux-protocoles");
    // A title of nothing but punctuation still needs an address.
    expect(slugify("?!…")).toBe("sujet");
  });

  it("gives two threads with the same title two addresses, per section", async () => {
    if (!configured) return;
    const first = await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: A,
      title: "Présentation",
      content: "Bonjour.",
    });
    const second = await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: B,
      title: "Présentation",
      content: "Salut.",
    });
    const elsewhere = await forumRepository.createTopic({
      categorySlug: `test-b-${suffix}`,
      authorId: B,
      title: "Présentation",
      content: "Coucou.",
    });

    expect(need(first).slug).toBe("presentation");
    expect(need(second).slug).toBe("presentation-2");
    // Scoped to the section, so the other section keeps the plain address.
    expect(need(elsewhere).slug).toBe("presentation");
  });

  it("opens the thread with a real post rather than a body column", async () => {
    if (!configured) return;
    const topic = await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: A,
      title: "Le modèle OSI",
      content: "Quelqu'un a un moyen mnémotechnique ?",
    });
    const view = await forumRepository.findTopic(`test-a-${suffix}`, need(topic).slug, A);

    expect(view?.posts).toHaveLength(1);
    expect(view?.posts[0]?.content).toContain("mnémotechnique");
    expect(view?.replyCount).toBe(0);
    expect(view?.author?.id).toBe(A);
  });

  // ─── Order ───────────────────────────────────────────────────────────────

  it("keeps a pinned thread on top, and orders the rest by last activity", async () => {
    if (!configured) return;
    const old = await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: A,
      title: "Ancien",
      content: "x",
    });
    const pinned = await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: A,
      title: "Épinglé",
      content: "x",
    });
    // Left at its creation time, which is now: it is the recent one.
    await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: A,
      title: "Récent",
      content: "x",
    });
    // Ages them apart: created in the same millisecond otherwise.
    await prisma.forumTopic.update({
      where: { id: need(old).id },
      data: { lastPostAt: new Date(Date.now() - 86_400_000) },
    });
    await prisma.forumTopic.update({
      where: { id: need(pinned).id },
      data: { lastPostAt: new Date(Date.now() - 172_800_000) },
    });
    await forumRepository.setPinned(need(pinned).id, true);

    const list = await forumRepository.listTopics(`test-a-${suffix}`, A);
    // The pinned one is the oldest of the three and still leads.
    expect(list?.topics.map((t) => t.title)).toEqual(["Épinglé", "Récent", "Ancien"]);
  });

  it("moves a thread up when someone replies, and counts the reply", async () => {
    if (!configured) return;
    const topic = await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: A,
      title: "Question",
      content: "?",
    });
    await prisma.forumTopic.update({
      where: { id: need(topic).id },
      data: { lastPostAt: new Date(Date.now() - 86_400_000) },
    });

    const res = await forumRepository.reply({
      topicId: need(topic).id,
      authorId: B,
      content: "!",
    });
    expect(res).not.toBeNull();

    const row = await prisma.forumTopic.findUnique({ where: { id: need(topic).id } });
    expect(row?.replyCount).toBe(1);
    expect(Date.now() - (row?.lastPostAt.getTime() ?? 0)).toBeLessThan(10_000);
  });

  // ─── Who hears about it ──────────────────────────────────────────────────

  it("tells everyone in the thread except the person who just spoke", async () => {
    if (!configured) return;
    const topic = await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: A,
      title: "Discussion",
      content: "?",
    });
    await forumRepository.reply({ topicId: need(topic).id, authorId: B, content: "une idée" });

    const third = await forumRepository.reply({
      topicId: need(topic).id,
      authorId: C,
      content: "une autre",
    });
    // A and B, not C. A forum where only the opener is told is one where a
    // conversation between two other people goes unnoticed by both.
    expect(third?.notify.sort()).toEqual([A, B].sort());

    const back = await forumRepository.reply({
      topicId: need(topic).id,
      authorId: A,
      content: "merci",
    });
    expect(back?.notify).not.toContain(A);
    expect(back?.notify.sort()).toEqual([B, C].sort());
  });

  it("refuses a reply to a locked thread, and to a hidden one", async () => {
    if (!configured) return;
    const locked = await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: A,
      title: "Fermé",
      content: "x",
    });
    await forumRepository.setLocked(need(locked).id, true);
    expect(
      await forumRepository.reply({ topicId: need(locked).id, authorId: B, content: "encore" }),
    ).toBeNull();

    const hidden = await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: A,
      title: "Retiré",
      content: "x",
    });
    await prisma.forumTopic.update({ where: { id: need(hidden).id }, data: { isHidden: true } });
    expect(
      await forumRepository.reply({ topicId: need(hidden).id, authorId: B, content: "encore" }),
    ).toBeNull();
    // And nothing was written either way.
    expect(await prisma.forumPost.count({ where: { authorId: B } })).toBe(0);
  });

  // ─── Removal ─────────────────────────────────────────────────────────────

  it("lets nobody but the author or an administrator remove a post", async () => {
    if (!configured) return;
    const topic = await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: A,
      title: "Sujet",
      content: "x",
    });
    const reply = await forumRepository.reply({
      topicId: need(topic).id,
      authorId: B,
      content: "à retirer",
    });

    expect(await forumRepository.hidePost(need(reply).postId, { id: C, isAdmin: false })).toBe(
      false,
    );
    expect(
      await prisma.forumPost.count({ where: { id: need(reply).postId, isHidden: true } }),
    ).toBe(0);

    expect(await forumRepository.hidePost(need(reply).postId, { id: B, isAdmin: false })).toBe(
      true,
    );
    const row = await prisma.forumTopic.findUnique({ where: { id: need(topic).id } });
    // The count follows the removal, or the list advertises a reply that is
    // no longer there.
    expect(row?.replyCount).toBe(0);
    expect(row?.isHidden).toBe(false);
  });

  it("takes the thread with the opening post", async () => {
    if (!configured) return;
    const topic = await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: A,
      title: "À retirer",
      content: "la question",
    });
    const first = await prisma.forumPost.findFirst({ where: { topicId: need(topic).id } });

    expect(await forumRepository.hidePost(need(first).id, { id: ADMIN, isAdmin: true })).toBe(true);

    const row = await prisma.forumTopic.findUnique({ where: { id: need(topic).id } });
    // A thread whose question is gone is not a thread.
    expect(row?.isHidden).toBe(true);
    expect(await forumRepository.findTopic(`test-a-${suffix}`, need(topic).slug, C)).toBeNull();
  });

  it("shows an author their own removed post, and nobody else", async () => {
    if (!configured) return;
    const topic = await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: A,
      title: "Sujet",
      content: "x",
    });
    const reply = await forumRepository.reply({
      topicId: need(topic).id,
      authorId: B,
      content: "retiré",
    });
    await forumRepository.hidePost(need(reply).postId, { id: B, isAdmin: false });

    const asAuthor = await forumRepository.findTopic(`test-a-${suffix}`, need(topic).slug, B);
    const asOther = await forumRepository.findTopic(`test-a-${suffix}`, need(topic).slug, C);
    // Otherwise a removal reads as a message that simply vanished.
    expect(asAuthor?.posts).toHaveLength(2);
    expect(asOther?.posts).toHaveLength(1);
  });

  it("keeps a hidden thread out of the section, except for its author", async () => {
    if (!configured) return;
    const topic = await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: A,
      title: "Caché",
      content: "x",
    });
    await prisma.forumTopic.update({ where: { id: need(topic).id }, data: { isHidden: true } });

    const forOthers = await forumRepository.listTopics(`test-a-${suffix}`, C);
    const forAuthor = await forumRepository.listTopics(`test-a-${suffix}`, A);
    expect(forOthers?.topics).toHaveLength(0);
    expect(forOthers?.total).toBe(0);
    expect(forAuthor?.topics).toHaveLength(1);
  });

  // ─── Editing ─────────────────────────────────────────────────────────────

  it("marks an edited post as edited, and refuses somebody else's", async () => {
    if (!configured) return;
    const topic = await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: A,
      title: "Sujet",
      content: "première version",
    });
    const first = await prisma.forumPost.findFirst({ where: { topicId: need(topic).id } });

    expect(await forumRepository.editPost(B, need(first).id, "pas à moi")).toBe(false);
    expect(await forumRepository.editPost(A, need(first).id, "seconde version")).toBe(true);

    const row = await prisma.forumPost.findUnique({ where: { id: need(first).id } });
    expect(row?.content).toBe("seconde version");
    // A thread cannot be rewritten under a reader without a trace.
    expect(row?.editedAt).not.toBeNull();
  });

  // ─── The front page ──────────────────────────────────────────────────────

  it("counts each section and dates it by its most recent thread", async () => {
    if (!configured) return;
    await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: A,
      title: "Un",
      content: "x",
    });
    await forumRepository.createTopic({
      categorySlug: `test-a-${suffix}`,
      authorId: A,
      title: "Deux",
      content: "x",
    });

    const cats = await forumRepository.listCategories(A);
    const a = cats.find((c) => c.slug === `test-a-${suffix}`);
    const b = cats.find((c) => c.slug === `test-b-${suffix}`);
    expect(a?.topicCount).toBe(2);
    expect(a?.lastPostAt).not.toBeNull();
    // An empty section says so rather than showing a date it does not have.
    expect(b?.topicCount).toBe(0);
    expect(b?.lastPostAt).toBeNull();
  });

  it("ships with its sections already there", async () => {
    if (!configured) return;
    const slugs = (await forumRepository.listCategories(A)).map((c) => c.slug);
    // Seeded by the migration: a forum whose front page is empty on the day it
    // ships is a forum nobody posts in.
    expect(slugs).toContain("general");
    expect(slugs).toContain("entraide");
  });
});
