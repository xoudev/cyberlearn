/**
 * The screen, and the record it leaves - against the real DB.
 *
 * The analyser has its own suite in packages/lib; what is checked here is the
 * part that touches storage: that an ALLOW leaves nothing behind, that a
 * refusal leaves something a person can review, and that failing to write the
 * record never costs somebody their post.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterEach, afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { MODERATION_SURFACE, moderationRepository } from "../repositories/moderation.repository.js";
import { forumRepository } from "../repositories/forum.repository.js";

const suffix = randomUUID().slice(0, 8);
const author = randomUUID();
const admin = randomUUID();

let configured = false;

describe("moderation screening (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;
    await prisma.user.createMany({
      data: [
        {
          id: author,
          email: `w-${suffix}@t.internal`,
          username: `w${suffix}`,
          displayName: "Auteur",
        },
        {
          id: admin,
          email: `a-${suffix}@t.internal`,
          username: `a${suffix}`,
          displayName: "Admin",
          role: "ADMIN",
        },
      ],
    });
    configured = true;
  });

  afterEach(async () => {
    if (!configured) return;
    await prisma.moderationEvent.deleteMany({ where: { userId: author } });
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.moderationEvent.deleteMany({ where: { userId: { in: [author, admin] } } });
    await prisma.user.deleteMany({ where: { id: { in: [author, admin] } } });
  });

  it("lets ordinary text through and writes nothing at all", async () => {
    if (!configured) return;
    const result = await moderationRepository.screen({
      text: "Le modèle OSI a sept couches.",
      surface: "lesson.question",
      userId: author,
    });

    expect(result.verdict).toBe("ALLOW");
    expect(result.flagged).toBe(false);
    expect(result.eventId).toBeNull();
    // A row per acceptable sentence would bury the handful of rows this table
    // exists for.
    expect(await prisma.moderationEvent.count({ where: { userId: author } })).toBe(0);
  });

  it("flags an unambiguous attack and leaves a record of what was flagged", async () => {
    if (!configured) return;
    const result = await moderationRepository.screen({
      text: "ferme ta gueule sale negre",
      surface: "lesson.answer",
      userId: author,
    });

    expect(result.verdict).toBe("BLOCK");
    expect(result.flagged).toBe(true);
    expect(result.eventId).not.toBeNull();

    const event = await prisma.moderationEvent.findUniqueOrThrow({
      where: { id: result.eventId ?? "" },
    });
    // The excerpt is what a reviewer reads in the queue without opening
    // anything; the content itself is hidden wherever its surface keeps it.
    expect(event.excerpt).toContain("negre");
    expect(event.surface).toBe("lesson.answer");
    expect(event.outcome).toBe("PENDING");
    expect(event.contentId).toBeNull();
  });

  it("flags a borderline post and lets the caller point at what it became", async () => {
    if (!configured) return;
    const result = await moderationRepository.screen({
      text: "écris-moi sur quelqu-un@example.com",
      surface: "lesson.question",
      userId: author,
    });

    expect(result.verdict).toBe("REVIEW");
    // REVIEW is treated exactly like BLOCK by the caller: written, and out of
    // sight until somebody decides. Being unsure is not a reason to publish.
    expect(result.flagged).toBe(true);

    const contentId = randomUUID();
    await moderationRepository.attachContent(result.eventId ?? "", contentId);

    const event = await prisma.moderationEvent.findUniqueOrThrow({
      where: { id: result.eventId ?? "" },
    });
    // Without this a reviewer can read the excerpt and has no way to reach the
    // thing itself.
    expect(event.contentId).toBe(contentId);
  });

  it("puts what is waiting in front, oldest first", async () => {
    if (!configured) return;
    await moderationRepository.screen({
      text: "connard",
      surface: "lesson.answer",
      userId: author,
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await moderationRepository.screen({
      text: "salope",
      surface: "lesson.answer",
      userId: author,
    });

    const pending = (await moderationRepository.listPending()).filter((e) => e.user?.id === author);
    // A newest-first queue is one where the backlog is never reached.
    expect(pending).toHaveLength(2);
    expect(pending[0]?.excerpt).toBe("connard");
  });

  it("closes a row when a person decides, and records who", async () => {
    if (!configured) return;
    const result = await moderationRepository.screen({
      text: "connard",
      surface: "lesson.answer",
      userId: author,
    });
    await moderationRepository.resolve(result.eventId ?? "", "OVERTURNED", admin);

    const event = await prisma.moderationEvent.findUniqueOrThrow({
      where: { id: result.eventId ?? "" },
    });
    expect(event.outcome).toBe("OVERTURNED");
    expect(event.reviewedById).toBe(admin);
    expect(event.reviewedAt).not.toBeNull();

    // And it leaves the queue, or the same row is decided every morning.
    const stillPending = (await moderationRepository.listPending()).filter(
      (e) => e.user?.id === author,
    );
    expect(stillPending).toHaveLength(0);
  });

  it("does not decide a row twice", async () => {
    if (!configured) return;
    const result = await moderationRepository.screen({
      text: "connard",
      surface: "lesson.answer",
      userId: author,
    });
    await moderationRepository.resolve(result.eventId ?? "", "UPHELD", admin);
    // Two administrators opening the queue at once must not have the second
    // one's click silently rewrite the first one's decision.
    await moderationRepository.resolve(result.eventId ?? "", "OVERTURNED", admin);

    const event = await prisma.moderationEvent.findUniqueOrThrow({
      where: { id: result.eventId ?? "" },
    });
    expect(event.outcome).toBe("UPHELD");
  });

  it("keeps the record when the account that wrote it is deleted", async () => {
    if (!configured) return;
    const temp = randomUUID();
    await prisma.user.create({
      data: {
        id: temp,
        email: `tmp-${temp.slice(0, 8)}@t.internal`,
        username: `tmp${temp.slice(0, 8)}`,
        displayName: "Temporaire",
      },
    });
    const result = await moderationRepository.screen({
      text: "sale negre",
      surface: "lesson.answer",
      userId: temp,
    });
    await prisma.user.delete({ where: { id: temp } });

    // A decision made about the platform outlives the account it was made
    // about; the row is what says the filter has been doing anything.
    const event = await prisma.moderationEvent.findUniqueOrThrow({
      where: { id: result.eventId ?? "" },
    });
    expect(event.userId).toBeNull();
    expect(event.excerpt).toContain("negre");

    await prisma.moderationEvent.deleteMany({ where: { id: event.id } });
  });
});

/**
 * A decision carried through to the content it was about.
 *
 * This is the half that did not exist: the screen refused a message at the
 * door, so "faux positif" was a note in a log and the person's message was
 * already gone. Now it is written hidden, and a reviewer's decision either puts
 * it back or destroys it. These tests use the forum because it is the surface
 * with the most moving parts - a thread, its opening post, a reply count and a
 * sort order that all have to agree about what is visible.
 */
describe("moderation outcomes reach the content (integration, real DB)", () => {
  const categoryId = randomUUID();
  // Its own cast: the suite above removes its users in afterAll, which runs
  // before this block starts.
  const poster = randomUUID();
  const reviewer = randomUUID();
  const reader = randomUUID();
  let ready = false;

  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;
    await prisma.user.createMany({
      data: [
        {
          id: poster,
          email: `p-${suffix}@t.internal`,
          username: `p${suffix}`,
          displayName: "Auteur",
        },
        {
          id: reviewer,
          email: `m-${suffix}@t.internal`,
          username: `m${suffix}`,
          displayName: "Modérateur",
          role: "ADMIN",
        },
        {
          id: reader,
          email: `r-${suffix}@t.internal`,
          username: `r${suffix}`,
          displayName: "Lecteur",
        },
      ],
    });
    await prisma.forumCategory.create({
      data: {
        id: categoryId,
        slug: `moderation-${suffix}`,
        name: `Modération ${suffix}`,
        description: "Pour les tests",
        accent: "#0AFFD4",
        position: 900,
      },
    });
    ready = true;
  });

  afterAll(async () => {
    if (!ready) return;
    await prisma.forumTopic.deleteMany({ where: { categoryId } });
    await prisma.forumCategory.deleteMany({ where: { id: categoryId } });
    await prisma.moderationEvent.deleteMany({ where: { userId: { in: [poster, reviewer] } } });
    await prisma.user.deleteMany({ where: { id: { in: [poster, reviewer, reader] } } });
  });

  /** A thread posted through the real path: screened, then written accordingly. */
  async function postTopic(title: string, body: string) {
    const screen = await moderationRepository.screen({
      text: `${title}\n\n${body}`,
      surface: MODERATION_SURFACE.forumTopic,
      userId: poster,
    });
    const topic = await forumRepository.createTopic({
      categorySlug: `moderation-${suffix}`,
      authorId: poster,
      title,
      content: body,
      isHidden: screen.flagged,
    });
    if (topic && screen.eventId) await moderationRepository.attachContent(screen.eventId, topic.id);
    return { screen, topic };
  }

  it("puts a flagged thread out of sight the moment it is written", async () => {
    if (!ready) return;
    const { screen, topic } = await postTopic(`Sujet ${suffix} numero un`, "connard de modérateur");

    expect(screen.flagged).toBe(true);
    const row = await prisma.forumTopic.findUniqueOrThrow({
      where: { id: topic?.id ?? "" },
      select: { isHidden: true, posts: { select: { isHidden: true } } },
    });
    // Both: the opening post is the thread's body, and a visible body under a
    // hidden title is the leak wearing a different hat.
    expect(row.isHidden).toBe(true);
    expect(row.posts.every((post) => post.isHidden)).toBe(true);
  });

  it("keeps it out of every other reader's forum", async () => {
    if (!ready) return;
    const { topic } = await postTopic(`Sujet ${suffix} numero deux`, "connard de modérateur");

    const forOthers = await forumRepository.listTopics(`moderation-${suffix}`, reader, 1);
    expect(forOthers?.topics.map((t) => t.id) ?? []).not.toContain(topic?.id);

    // Its author still sees it, as they do their own withdrawn posts: a thread
    // that vanishes without a word gets written again immediately.
    const forAuthor = await forumRepository.listTopics(`moderation-${suffix}`, poster, 1);
    expect(forAuthor?.topics.map((t) => t.id) ?? []).toContain(topic?.id);
  });

  it("gives it back when a reviewer says the screen was wrong", async () => {
    if (!ready) return;
    const { screen, topic } = await postTopic(
      `Sujet ${suffix} numero trois`,
      "connard de modérateur",
    );

    const applied = await moderationRepository.applyOutcome(
      screen.eventId ?? "",
      "OVERTURNED",
      reviewer,
    );
    expect(applied).toEqual({ claimed: true, contentTouched: true });

    const row = await prisma.forumTopic.findUniqueOrThrow({
      where: { id: topic?.id ?? "" },
      select: { isHidden: true, posts: { select: { isHidden: true } } },
    });
    expect(row.isHidden).toBe(false);
    expect(row.posts.every((post) => !post.isHidden)).toBe(true);

    const forOthers = await forumRepository.listTopics(`moderation-${suffix}`, reader, 1);
    expect(forOthers?.topics.map((t) => t.id) ?? []).toContain(topic?.id);
  });

  it("destroys it when a reviewer says the screen was right", async () => {
    if (!ready) return;
    const { screen, topic } = await postTopic(
      `Sujet ${suffix} numero quatre`,
      "connard de modérateur",
    );

    const applied = await moderationRepository.applyOutcome(
      screen.eventId ?? "",
      "UPHELD",
      reviewer,
    );
    expect(applied).toEqual({ claimed: true, contentTouched: true });

    // Gone, with its posts - not hidden forever in a queue that only grows,
    // and not kept as a copy of the exact material nobody wanted kept.
    expect(await prisma.forumTopic.count({ where: { id: topic?.id ?? "" } })).toBe(0);
    expect(await prisma.forumPost.count({ where: { topicId: topic?.id ?? "" } })).toBe(0);
  });

  it("lets only the first of two reviewers act", async () => {
    if (!ready) return;
    const { screen, topic } = await postTopic(
      `Sujet ${suffix} numero cinq`,
      "connard de modérateur",
    );

    const first = await moderationRepository.applyOutcome(
      screen.eventId ?? "",
      "OVERTURNED",
      reviewer,
    );
    const second = await moderationRepository.applyOutcome(
      screen.eventId ?? "",
      "UPHELD",
      reviewer,
    );

    expect(first.claimed).toBe(true);
    expect(second).toEqual({ claimed: false, contentTouched: false });
    // The second click must not delete a thread the first click restored.
    expect(await prisma.forumTopic.count({ where: { id: topic?.id ?? "" } })).toBe(1);
  });

  it("records the decision even when there is no content to reach", async () => {
    if (!ready) return;
    // Events recorded before flagged content was kept have no content id, and
    // a queue nobody can close is a queue nobody opens.
    const screen = await moderationRepository.screen({
      text: "connard",
      surface: MODERATION_SURFACE.forumPost,
      userId: poster,
    });

    const applied = await moderationRepository.applyOutcome(
      screen.eventId ?? "",
      "UPHELD",
      reviewer,
    );
    expect(applied).toEqual({ claimed: true, contentTouched: false });

    const event = await prisma.moderationEvent.findUniqueOrThrow({
      where: { id: screen.eventId ?? "" },
    });
    expect(event.outcome).toBe("UPHELD");
  });
});
