/**
 * Reports on published content, and the console's hand on it, against the
 * real database.
 *
 * Only what the reporter can see can be reported; one report per reporter
 * and content, reopened when filed again; hiding a reply takes it out of the
 * thread's count and closes its reports, journalled and told to its author;
 * a message its author withdrew is never shown again from the console; the
 * console closing a report does not use up its reporter's hourly limit; a
 * solution the console hid stays hidden when its author publishes again;
 * deleting a thread's opening message deletes the thread and closes the
 * reports of every message in it; an erased reporter's report stays, unnamed.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { contentModerationRepository } from "../repositories/content-moderation.repository.js";
import { contentReportRepository } from "../repositories/content-report.repository.js";
import { forumRepository } from "../repositories/forum.repository.js";
import { writeupRepository } from "../repositories/writeup.repository.js";

const suffix = randomUUID().slice(0, 8);
const author = randomUUID();
const reader = randomUUID();
const admin = randomUUID();
const categoryId = randomUUID();
const challengeId = randomUUID();
let topicId = "";
let openingId = "";
let replyId = "";
let configured = false;

const NOTICE = { title: "Ton message n'est plus visible", body: "Après relecture…" };

async function replyCount(): Promise<number> {
  const topic = await prisma.forumTopic.findUnique({
    where: { id: topicId },
    select: { replyCount: true },
  });
  return topic?.replyCount ?? -1;
}

describe("content reports and moderation (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;
    await prisma.user.createMany({
      data: [
        { id: author, email: `cr-a-${suffix}@t.internal`, displayName: "Auteur" },
        {
          id: reader,
          email: `cr-r-${suffix}@t.internal`,
          displayName: "Lecteur",
          username: `crr${suffix}`,
        },
        { id: admin, email: `cr-m-${suffix}@t.internal`, displayName: "Modo", role: "ADMIN" },
      ],
    });
    await prisma.forumCategory.create({
      data: {
        id: categoryId,
        slug: `reports-${suffix}`,
        name: `Signalements ${suffix}`,
        description: "Pour les tests",
        accent: "#0AFFD4",
        position: 901,
      },
    });
    const topic = await forumRepository.createTopic({
      categorySlug: `reports-${suffix}`,
      authorId: reader,
      title: "Une question de réseau",
      content: "Comment découper un /24 en quatre ?",
    });
    if (topic === null) throw new Error("no topic");
    topicId = topic.id;
    const first = await prisma.forumPost.findFirstOrThrow({
      where: { topicId },
      select: { id: true },
    });
    openingId = first.id;
    const reply = await forumRepository.reply({
      topicId,
      authorId: author,
      content: "Une réponse que quelqu'un va signaler.",
    });
    if (reply === null) throw new Error("no reply");
    replyId = reply.postId;
    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.contentReport.deleteMany({
      where: { contentId: { in: [openingId, replyId] } },
    });
    await prisma.challenge.deleteMany({ where: { id: challengeId } });
    await prisma.notification.deleteMany({ where: { userId: { in: [author, reader] } } });
    await prisma.auditLog.deleteMany({ where: { actorId: admin } });
    await prisma.forumTopic.deleteMany({ where: { categoryId } });
    await prisma.forumCategory.deleteMany({ where: { id: categoryId } });
    await prisma.user.deleteMany({ where: { id: { in: [author, reader, admin] } } });
  });

  it("names the author of what a reader can see, and nothing of what they cannot", async () => {
    if (!configured) return;
    expect(await contentModerationRepository.reportable("FORUM_POST", replyId, reader)).toEqual({
      authorId: author,
    });
    expect(
      await contentModerationRepository.reportable("FORUM_POST", randomUUID(), reader),
    ).toBeNull();
  });

  it("keeps one report per reporter and content, reopened when filed again", async () => {
    if (!configured) return;
    await contentReportRepository.report({
      reporterId: reader,
      surface: "FORUM_POST",
      contentId: replyId,
      reason: "SPAM",
      comment: null,
    });
    await contentReportRepository.report({
      reporterId: reader,
      surface: "FORUM_POST",
      contentId: replyId,
      reason: "HATE",
      comment: "Insultes.",
    });
    const rows = await prisma.contentReport.findMany({ where: { contentId: replyId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ reason: "HATE", comment: "Insultes.", status: "OPEN" });
    expect(
      await contentReportRepository.countSince(reader, new Date(Date.now() - 60_000)),
    ).toBeGreaterThanOrEqual(1);
  });

  it("lists the reported content for the console, with its author and its reports", async () => {
    if (!configured) return;
    const queue = await contentReportRepository.openByContent({ page: 1, pageSize: 200 });
    const group = queue.rows.find((g) => g.contentId === replyId);
    expect(group?.content).toMatchObject({
      surface: "FORUM_POST",
      text: "Une réponse que quelqu'un va signaler.",
      author: { id: author, displayName: "Auteur" },
      opensThread: false,
      learnerPath: `/forum/reports-${suffix}/une-question-de-reseau`,
      pendingReview: false,
      authorWithdrew: false,
    });
    expect(queue.openReports).toBeGreaterThanOrEqual(1);
    expect(group?.reports).toEqual([
      expect.objectContaining({ reason: "HATE", reporterUsername: `crr${suffix}` }),
    ]);
  });

  it("hides a reply: out of the count, its reports closed, journalled, its author told", async () => {
    if (!configured) return;
    expect(await replyCount()).toBe(1);
    const result = await contentModerationRepository.apply({
      surface: "FORUM_POST",
      id: replyId,
      gesture: "hide",
      actorId: admin,
      notice: NOTICE,
    });
    expect(result).toMatchObject({ ok: true, reportsClosed: 1 });
    expect(await replyCount()).toBe(0);
    const [report] = await prisma.contentReport.findMany({ where: { contentId: replyId } });
    expect(report).toMatchObject({ status: "HIDDEN", resolvedById: admin });
    expect(
      await prisma.auditLog.count({
        where: { actorId: admin, action: "moderation.content.hide", targetId: replyId },
      }),
    ).toBe(1);
    expect(
      await prisma.notification.count({
        where: { userId: author, type: "MODERATION_ALERT", title: NOTICE.title },
      }),
    ).toBe(1);

    // Hidden, it can no longer be reported, and a second click changes nothing.
    expect(await contentModerationRepository.reportable("FORUM_POST", replyId, reader)).toBeNull();
    expect(
      await contentModerationRepository.apply({
        surface: "FORUM_POST",
        id: replyId,
        gesture: "hide",
        actorId: admin,
        notice: NOTICE,
      }),
    ).toEqual({ ok: false, reason: "UNCHANGED" });
  });

  it("shows it again, back in the count", async () => {
    if (!configured) return;
    const result = await contentModerationRepository.apply({
      surface: "FORUM_POST",
      id: replyId,
      gesture: "restore",
      actorId: admin,
      notice: NOTICE,
    });
    expect(result.ok).toBe(true);
    expect(await replyCount()).toBe(1);
  });

  it("lists it for the console as visible, its reports closed by the hiding", async () => {
    if (!configured) return;
    const slice = await contentModerationRepository.listForConsole({
      surface: "FORUM_POST",
      hidden: false,
      q: "quelqu'un va signaler",
      page: 1,
      pageSize: 25,
    });
    const row = slice.rows.find((r) => r.id === replyId);
    expect(row).toMatchObject({ isHidden: false, openReports: 0, pendingReview: false });
  });

  it("closes the reports and leaves the content when dismissed", async () => {
    if (!configured) return;
    await contentReportRepository.report({
      reporterId: reader,
      surface: "FORUM_POST",
      contentId: replyId,
      reason: "OTHER",
      comment: null,
    });
    // The console closing it moves updatedAt, not the reporter's hour.
    await new Promise((resolve) => setTimeout(resolve, 20));
    const since = new Date();
    expect(
      await contentModerationRepository.dismissReports({
        surface: "FORUM_POST",
        id: replyId,
        actorId: admin,
      }),
    ).toBe(1);
    expect(await prisma.forumPost.count({ where: { id: replyId, isHidden: false } })).toBe(1);
    expect(await contentReportRepository.countSince(reader, since)).toBe(0);
  });

  it("never shows again from the console a message its author withdrew", async () => {
    if (!configured) return;
    const withdrawn = await forumRepository.reply({
      topicId,
      authorId: author,
      content: "Un message que son auteur retire lui-même.",
    });
    if (withdrawn === null) throw new Error("no reply");
    expect(await forumRepository.hidePost(withdrawn.postId, { id: author, isAdmin: false })).toBe(
      true,
    );

    const slice = await contentModerationRepository.listForConsole({
      surface: "FORUM_POST",
      hidden: true,
      q: "retire lui-même",
      page: 1,
      pageSize: 25,
    });
    expect(slice.rows.find((r) => r.id === withdrawn.postId)).toMatchObject({
      isHidden: true,
      authorWithdrew: true,
      pendingReview: false,
    });
    expect(
      await contentModerationRepository.apply({
        surface: "FORUM_POST",
        id: withdrawn.postId,
        gesture: "restore",
        actorId: admin,
        notice: NOTICE,
      }),
    ).toEqual({ ok: false, reason: "AUTHOR_WITHDRAWN" });
    expect(await prisma.forumPost.count({ where: { id: withdrawn.postId, isHidden: true } })).toBe(
      1,
    );
  });

  it("keeps a solution the console hid hidden when its author publishes it again", async () => {
    if (!configured) return;
    await prisma.challenge.create({
      data: {
        id: challengeId,
        refCode: `CL-CHG-T${suffix}`,
        slug: `signalements-${suffix}`,
        title: "Défi de test",
        description: "Pour les tests",
        instructions: "Rien à faire.",
        category: "CYBERSEC",
        difficulty: "BEGINNER",
        type: "CTF",
        xpReward: 10,
      },
    });
    const text = "Une solution que la console va masquer, avec assez de texte pour passer.";
    const written = await writeupRepository.upsert({
      challengeId,
      userId: author,
      content: text,
      isHidden: false,
    });
    if (written === null) throw new Error("no writeup");
    expect(
      await contentModerationRepository.apply({
        surface: "CHALLENGE_WRITEUP",
        id: written.id,
        gesture: "hide",
        actorId: admin,
        notice: null,
      }),
    ).toMatchObject({ ok: true });

    expect(
      await writeupRepository.upsert({
        challengeId,
        userId: author,
        content: text,
        isHidden: false,
      }),
    ).toBeNull();
    expect(await writeupRepository.findOwn(author, challengeId)).toMatchObject({
      isHidden: true,
      hiddenByModeration: true,
    });

    // Shown again by the console, it is its author's to replace again.
    await contentModerationRepository.apply({
      surface: "CHALLENGE_WRITEUP",
      id: written.id,
      gesture: "restore",
      actorId: admin,
      notice: null,
    });
    expect(
      await writeupRepository.upsert({
        challengeId,
        userId: author,
        content: text,
        isHidden: false,
      }),
    ).toEqual({ id: written.id });
  });

  it("deletes the thread with its opening message, and closes every message's reports", async () => {
    if (!configured) return;
    await contentReportRepository.report({
      reporterId: reader,
      surface: "FORUM_POST",
      contentId: replyId,
      reason: "SPAM",
      comment: null,
    });
    const result = await contentModerationRepository.apply({
      surface: "FORUM_POST",
      id: openingId,
      gesture: "delete",
      actorId: admin,
      notice: null,
    });
    expect(result).toMatchObject({ ok: true, reportsClosed: 1 });
    expect(await prisma.forumTopic.count({ where: { id: topicId } })).toBe(0);
    const [report] = await prisma.contentReport.findMany({ where: { contentId: replyId } });
    expect(report?.status).toBe("DELETED");
  });

  it("keeps the report, unnamed, when the reporter's account is erased", async () => {
    if (!configured) return;
    await prisma.user.delete({ where: { id: reader } });
    const [report] = await prisma.contentReport.findMany({ where: { contentId: replyId } });
    expect(report?.reporterId).toBeNull();
  });
});
