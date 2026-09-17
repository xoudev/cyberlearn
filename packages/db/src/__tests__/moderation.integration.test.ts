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
import { moderationRepository } from "../repositories/moderation.repository.js";

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
    expect(result.allowed).toBe(true);
    expect(result.eventId).toBeNull();
    // A row per acceptable sentence would bury the handful of rows this table
    // exists for.
    expect(await prisma.moderationEvent.count({ where: { userId: author } })).toBe(0);
  });

  it("refuses an unambiguous attack and leaves a record of what was refused", async () => {
    if (!configured) return;
    const result = await moderationRepository.screen({
      text: "ferme ta gueule sale negre",
      surface: "lesson.answer",
      userId: author,
    });

    expect(result.verdict).toBe("BLOCK");
    expect(result.allowed).toBe(false);
    expect(result.eventId).not.toBeNull();

    const event = await prisma.moderationEvent.findUniqueOrThrow({
      where: { id: result.eventId ?? "" },
    });
    // Blocked content is not stored anywhere else - refusing it and keeping a
    // copy would be the worst of both - so the excerpt is what a reviewer has.
    expect(event.excerpt).toContain("negre");
    expect(event.surface).toBe("lesson.answer");
    expect(event.outcome).toBe("PENDING");
    expect(event.contentId).toBeNull();
  });

  it("allows a flagged post and lets the caller point at what it became", async () => {
    if (!configured) return;
    const result = await moderationRepository.screen({
      text: "écris-moi sur quelqu-un@example.com",
      surface: "lesson.question",
      userId: author,
    });

    expect(result.verdict).toBe("REVIEW");
    // Flagged is not refused: it is published, and a person looks at it after.
    expect(result.allowed).toBe(true);

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
