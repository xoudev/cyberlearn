/**
 * review_cards and review_sessions over the Data API, and the repository on
 * the real database.
 *
 * A learner reads their own cards and sessions, nobody else's, and writes
 * none: a client that could would move a card up a box it never earned,
 * retire the questions it keeps missing, or mark a session's XP as its own.
 * The repository's writes are idempotent or conditional, and the unique
 * indexes are what make them so.
 *
 * Skips gracefully when the Supabase or database variables are absent, like
 * the other integration specs. Rows are removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { reviewCardRepository } from "../repositories/review-card.repository.js";

const EMAIL_A = "review-cards-a@test.cyberlearn.internal";
const EMAIL_B = "review-cards-b@test.cyberlearn.internal";
const PASSWORD = "TestPassword123!";
const LESSON_REF = "CL-LSN-RC-RLS-V01";
const DAY = "2026-10-11";

describe("review_cards and review_sessions RLS (integration)", () => {
  let url = "";
  let anonKey = "";
  let admin: SupabaseClient;
  let configured = false;
  let userA = "";
  let userB = "";
  let lessonId = "";
  let cardA = "";

  async function cleanup(): Promise<void> {
    // Cards and sessions go with their account and their lesson (cascade).
    await admin.from("lessons").delete().eq("refCode", LESSON_REF);
    const { data } = await admin.auth.admin.listUsers();
    for (const email of [EMAIL_A, EMAIL_B]) {
      const existing = data.users.find((u) => u.email === email);
      if (existing) {
        await admin.from("users").delete().eq("id", existing.id);
        await admin.auth.admin.deleteUser(existing.id);
      }
    }
  }

  async function createUser(email: string, name: string): Promise<string> {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`user: ${error?.message}`);
    const { error: rowError } = await admin.from("users").insert({
      id: data.user.id,
      email,
      displayName: name,
      updatedAt: new Date().toISOString(),
    });
    if (rowError) throw new Error(`users row: ${rowError.message}`);
    return data.user.id;
  }

  async function signIn(email: string): Promise<SupabaseClient> {
    const signer = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await signer.auth.signInWithPassword({ email, password: PASSWORD });
    if (error || !data.session) throw new Error(`Sign in failed: ${error?.message}`);
    return createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
  }

  async function insertCard(userId: string, quizId: string): Promise<string> {
    const id = randomUUID();
    const { error } = await admin.from("review_cards").insert({
      id,
      userId,
      lessonId,
      quizId,
      dueAt: new Date().toISOString(),
    });
    if (error) throw new Error(`card: ${error.message}`);
    return id;
  }

  async function insertSession(userId: string): Promise<void> {
    const { error } = await admin
      .from("review_sessions")
      .insert({ id: randomUUID(), userId, day: DAY, draw: [] });
    if (error) throw new Error(`session: ${error.message}`);
  }

  beforeAll(async () => {
    url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
    anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
    const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
    if (!url || !anonKey || !serviceKey) return;

    admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await cleanup();

    userA = await createUser(EMAIL_A, "Révisions A");
    userB = await createUser(EMAIL_B, "Révisions B");

    lessonId = randomUUID();
    const { error: lessonError } = await admin.from("lessons").insert({
      id: lessonId,
      refCode: LESSON_REF,
      slug: "review-cards-rls-lesson",
      title: "Une leçon",
      description: "Used only by the review_cards RLS test",
      category: "DEV",
      difficulty: "BEGINNER",
      estimatedMinutes: 5,
      xpReward: 10,
      contentMdx: "# Contenu",
      status: "PUBLISHED",
      updatedAt: new Date().toISOString(),
    });
    if (lessonError) throw new Error(`lesson: ${lessonError.message}`);

    cardA = await insertCard(userA, "q-1");
    await insertCard(userB, "q-1");
    await insertSession(userA);
    await insertSession(userB);
    configured = true;
  });

  afterAll(async () => {
    if (admin) await cleanup();
  });

  it("lets a learner read their own cards, and nobody else's", async () => {
    if (!configured) return;
    const client = await signIn(EMAIL_A);
    const { data, error } = await client.from("review_cards").select("id,userId");
    expect(error).toBeNull();
    expect(data).toEqual([{ id: cardA, userId: userA }]);
  });

  it("lets a learner read their own session, and nobody else's", async () => {
    if (!configured) return;
    const client = await signIn(EMAIL_B);
    const { data, error } = await client.from("review_sessions").select("userId,day");
    expect(error).toBeNull();
    expect(data).toEqual([{ userId: userB, day: DAY }]);
  });

  it("refuses a card a client writes for itself", async () => {
    if (!configured) return;
    const client = await signIn(EMAIL_A);
    const { error } = await client.from("review_cards").insert({
      id: randomUUID(),
      userId: userA,
      lessonId,
      quizId: "q-2",
      dueAt: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
  });

  it("refuses to move or retire a card from a client", async () => {
    if (!configured) return;
    const client = await signIn(EMAIL_A);
    await client.from("review_cards").update({ box: 4 }).eq("id", cardA);
    await client.from("review_cards").delete().eq("id", cardA);
    const { data } = await admin.from("review_cards").select("box").eq("id", cardA).single();
    expect(data?.box).toBe(1);
  });

  it("refuses to hand a session in or claim its XP from a client", async () => {
    if (!configured) return;
    const client = await signIn(EMAIL_A);
    await client
      .from("review_sessions")
      .update({ completedAt: new Date().toISOString(), xpCredited: true })
      .eq("userId", userA);
    const { data } = await admin
      .from("review_sessions")
      .select("completedAt,xpCredited")
      .eq("userId", userA)
      .single();
    expect(data).toEqual({ completedAt: null, xpCredited: false });
  });

  it("gives the anonymous role nothing", async () => {
    if (!configured) return;
    const anon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const cards = await anon.from("review_cards").select("id");
    expect(cards.error !== null || (cards.data ?? []).length === 0).toBe(true);
    const sessions = await anon.from("review_sessions").select("id");
    expect(sessions.error !== null || (sessions.data ?? []).length === 0).toBe(true);
  });
});

describe("reviewCardRepository (integration, real DB)", () => {
  const suffix = randomUUID().slice(0, 8);
  const learner = randomUUID();
  let lessonId = "";
  let configured = false;

  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;
    await prisma.user.create({
      data: { id: learner, email: `rc-${suffix}@t.internal`, displayName: "Cartes" },
    });
    const lesson = await prisma.lesson.create({
      data: {
        refCode: `RC-LSN-${suffix}-V01`,
        slug: `rc-lesson-${suffix}`,
        title: "Une leçon",
        description: "Pour le test.",
        category: "DEV",
        difficulty: "BEGINNER",
        estimatedMinutes: 5,
        xpReward: 10,
        contentMdx: "# Contenu",
        status: "PUBLISHED",
      },
      select: { id: true },
    });
    lessonId = lesson.id;
    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.user.deleteMany({ where: { id: learner } });
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
  });

  it("enqueues a lesson's cards once, however often the completion is replayed", async () => {
    if (!configured) return;
    const now = new Date("2026-10-11T08:00:00Z");
    const cards = [
      { quizId: "q-1", box: 1, dueAt: new Date("2026-10-12T00:00:00Z") },
      { quizId: "q-2", box: 3, dueAt: new Date("2026-10-18T00:00:00Z") },
    ];
    expect(await reviewCardRepository.enqueueForLesson(learner, lessonId, cards)).toBe(2);
    expect(await reviewCardRepository.enqueueForLesson(learner, lessonId, cards)).toBe(0);
    expect(await prisma.reviewCard.count({ where: { userId: learner } })).toBe(2);

    const due = await reviewCardRepository.findDue(learner, new Date("2026-10-12T05:00:00Z"));
    expect(due.map((card) => card.quizId)).toEqual(["q-1"]);
    expect(await reviewCardRepository.findDue(learner, now)).toEqual([]);
  });

  it("moves a card up a box on a right answer and back to the first on a wrong one", async () => {
    if (!configured) return;
    const question = { lessonId, quizId: "q-1" };
    const read = () =>
      prisma.reviewCard.findUnique({
        where: { userId_lessonId_quizId: { userId: learner, ...question } },
        select: { box: true, dueAt: true, lapses: true, retiredAt: true },
      });

    await reviewCardRepository.applyAnswer(
      learner,
      question,
      true,
      new Date("2026-10-12T08:00:00Z"),
    );
    expect(await read()).toEqual({
      box: 2,
      dueAt: new Date("2026-10-15T00:00:00Z"),
      lapses: 0,
      retiredAt: null,
    });

    await reviewCardRepository.applyAnswer(
      learner,
      question,
      false,
      new Date("2026-10-15T08:00:00Z"),
    );
    expect(await read()).toEqual({
      box: 1,
      dueAt: new Date("2026-10-16T00:00:00Z"),
      lapses: 1,
      retiredAt: null,
    });
  });

  it("retires the cards asked, and leaves the others", async () => {
    if (!configured) return;
    const card = await prisma.reviewCard.findUniqueOrThrow({
      where: { userId_lessonId_quizId: { userId: learner, lessonId, quizId: "q-2" } },
      select: { id: true },
    });
    const at = new Date("2026-10-16T08:00:00Z");
    expect(await reviewCardRepository.retire(learner, [card.id], at)).toBe(1);
    expect(await reviewCardRepository.retire(learner, [card.id], at)).toBe(0);
    expect(await prisma.reviewCard.count({ where: { userId: learner, retiredAt: null } })).toBe(1);
  });

  it("stores one session a day, hands it in once and credits its XP once", async () => {
    if (!configured) return;
    const draw = [{ cardId: "c", lessonId, quizId: "q-1", domain: "Une leçon", order: [1, 0] }];
    const [first, second] = await Promise.all([
      reviewCardRepository.createSession(learner, "2026-10-12", draw),
      reviewCardRepository.createSession(learner, "2026-10-12", []),
    ]);
    expect(first.id).toBe(second.id);
    expect(await prisma.reviewSession.count({ where: { userId: learner } })).toBe(1);

    const session = await reviewCardRepository.findSession(learner, "2026-10-12");
    expect(session?.day).toBe("2026-10-12");

    const at = new Date("2026-10-12T08:05:00Z");
    expect(await reviewCardRepository.claimSessionXp(first.id)).toBe(false);
    expect(await reviewCardRepository.completeSession(first.id, { "0": 1 }, at)).toBe(true);
    expect(await reviewCardRepository.completeSession(first.id, { "0": 0 }, at)).toBe(false);
    expect(await reviewCardRepository.claimSessionXp(first.id)).toBe(true);
    expect(await reviewCardRepository.claimSessionXp(first.id)).toBe(false);
    expect((await reviewCardRepository.findSession(learner, "2026-10-12"))?.answers).toEqual({
      "0": 1,
    });
  });

  it("goes when the account goes", async () => {
    if (!configured) return;
    const gone = randomUUID();
    await prisma.user.create({
      data: { id: gone, email: `rc-gone-${suffix}@t.internal`, displayName: "Partie" },
    });
    await reviewCardRepository.enqueueForLesson(gone, lessonId, [
      { quizId: "q-1", box: 1, dueAt: new Date() },
    ]);
    await reviewCardRepository.createSession(gone, "2026-10-12", []);
    await prisma.user.delete({ where: { id: gone } });
    expect(await prisma.reviewCard.count({ where: { userId: gone } })).toBe(0);
    expect(await prisma.reviewSession.count({ where: { userId: gone } })).toBe(0);
  });
});
