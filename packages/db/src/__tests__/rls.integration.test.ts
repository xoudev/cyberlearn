/**
 * RLS Integration Tests
 *
 * Verifies that Row Level Security policies are correctly applied.
 * Runs against the real Supabase database - requires NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to be set.
 *
 * These tests satisfy Phase 1 acceptance criterion:
 * "RLS testée : un user ne peut PAS lire les progress d'un autre user"
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const TEST_USER_A_EMAIL = "rls-test-a@test.cyberlearn.internal";
const TEST_USER_B_EMAIL = "rls-test-b@test.cyberlearn.internal";
const TEST_PASSWORD = "TestPassword123!";

describe("RLS policies (integration)", () => {
  // All vars initialized in beforeAll after setupFiles has loaded env
  let supabaseUrl: string;
  let supabaseAnonKey: string;
  let adminClient: SupabaseClient;
  let anonClient: SupabaseClient;
  let configured = false;

  let userAId: string;
  let userBId: string;
  let publishedLessonId: string;
  let draftLessonId: string;
  let createdDraftLessonId: string; // Created by test setup, cleaned up in afterAll
  let quizId: string; // Created by test setup (with a question + a User B attempt)

  beforeAll(async () => {
    supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
    supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) return;

    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    anonClient = createClient(supabaseUrl, supabaseAnonKey);

    // Cleanup leftover test users from a previous interrupted run (idempotent)
    for (const email of [TEST_USER_A_EMAIL, TEST_USER_B_EMAIL]) {
      const { data } = await adminClient.auth.admin.listUsers();
      const existing = data.users.find((u) => u.email === email);
      if (existing) {
        await adminClient.from("user_lesson_progress").delete().eq("userId", existing.id);
        await adminClient
          .from("lessons")
          .delete()
          .eq("authorId", existing.id)
          .eq("refCode", "CL-LSN-RLS-V01");
        await adminClient.from("users").delete().eq("id", existing.id);
        await adminClient.auth.admin.deleteUser(existing.id);
      }
    }

    // Create two isolated test users in Supabase Auth
    const { data: aData, error: aErr } = await adminClient.auth.admin.createUser({
      email: TEST_USER_A_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    const { data: bData, error: bErr } = await adminClient.auth.admin.createUser({
      email: TEST_USER_B_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    if (aErr || !aData.user) throw new Error(`Failed to create user A: ${aErr?.message}`);
    if (bErr || !bData.user) throw new Error(`Failed to create user B: ${bErr?.message}`);

    userAId = aData.user.id;
    userBId = bData.user.id;

    // Insert public.users rows (normally done by /auth/callback)
    // updatedAt is NOT NULL without default - Prisma manages it normally, we set it manually here
    const now = new Date().toISOString();
    const { error: usersInsertError } = await adminClient.from("users").insert([
      { id: userAId, email: TEST_USER_A_EMAIL, displayName: "RLS Test User A", updatedAt: now },
      { id: userBId, email: TEST_USER_B_EMAIL, displayName: "RLS Test User B", updatedAt: now },
    ]);
    if (usersInsertError)
      throw new Error(`Failed to insert test users: ${usersInsertError.message}`);

    // Get lesson IDs from seed
    const { data: published } = await adminClient
      .from("lessons")
      .select("id")
      .eq("status", "PUBLISHED")
      .limit(1)
      .single();
    const { data: draft } = await adminClient
      .from("lessons")
      .select("id")
      .eq("status", "DRAFT")
      .limit(1)
      .single();

    if (!published) throw new Error("No PUBLISHED lessons - run seed first");

    publishedLessonId = published.id;

    // Create a DRAFT lesson for RLS testing (not from seed)
    if (draft) {
      draftLessonId = draft.id;
    } else {
      const { data: newDraft, error: draftErr } = await adminClient
        .from("lessons")
        .insert({
          id: randomUUID(),
          refCode: "CL-LSN-RLS-V01",
          slug: "rls-test-draft-lesson",
          title: "RLS Test Draft Lesson",
          description: "Used only for RLS integration tests",
          category: "CYBERSEC",
          difficulty: "BEGINNER",
          estimatedMinutes: 5,
          xpReward: 0,
          status: "DRAFT",
          contentMdx: "# Draft",
          authorId: userAId,
          updatedAt: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (draftErr || !newDraft)
        throw new Error(`Failed to create draft lesson: ${draftErr?.message}`);
      draftLessonId = newDraft.id;
      createdDraftLessonId = newDraft.id;
    }

    // Create progress for User B (User A must not be able to read it)
    const { error: progressInsertError } = await adminClient.from("user_lesson_progress").insert({
      id: randomUUID(),
      userId: userBId,
      lessonId: publishedLessonId,
      status: "IN_PROGRESS",
      attempts: 1,
      timeSpentSeconds: 120,
    });
    if (progressInsertError)
      throw new Error(`Failed to insert progress: ${progressInsertError.message}`);

    // ── Quiz fixtures (created via service_role; clients must NOT write these) ──
    const { data: anyPath } = await adminClient.from("paths").select("id").limit(1).single();
    if (!anyPath) throw new Error("No paths - run seed first");

    quizId = randomUUID();
    const { error: quizErr } = await adminClient.from("quiz").insert({
      id: quizId,
      pathId: anyPath.id,
      questionsToDraw: 5,
      updatedAt: new Date().toISOString(),
    });
    if (quizErr) throw new Error(`Failed to insert quiz: ${quizErr.message}`);

    const { error: qErr } = await adminClient.from("quiz_questions").insert({
      id: randomUUID(),
      quizId,
      question: "RLS test question?",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
      correctOptionId: "a", // must never be readable by clients
      orderIndex: 0,
    });
    if (qErr) throw new Error(`Failed to insert quiz_question: ${qErr.message}`);

    // An attempt owned by User B - User A must not be able to read it.
    const { error: aErr2 } = await adminClient.from("quiz_attempts").insert({
      id: randomUUID(),
      userId: userBId,
      quizId,
      score: 80,
      passed: true,
      answers: [{ questionId: "q1", selected: "a", correct: true }],
    });
    if (aErr2) throw new Error(`Failed to insert quiz_attempt: ${aErr2.message}`);

    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await adminClient.from("user_lesson_progress").delete().in("userId", [userAId, userBId]);
    if (quizId) {
      // Cascades to quiz_questions + quiz_attempts.
      await adminClient.from("quiz").delete().eq("id", quizId);
    }
    if (createdDraftLessonId) {
      await adminClient.from("lessons").delete().eq("id", createdDraftLessonId);
    }
    await adminClient.from("users").delete().in("id", [userAId, userBId]);
    await adminClient.auth.admin.deleteUser(userAId);
    await adminClient.auth.admin.deleteUser(userBId);
  });

  async function signInAs(email: string): Promise<SupabaseClient> {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email,
      password: TEST_PASSWORD,
    });
    if (error || !data.session) throw new Error(`Sign in failed: ${error?.message}`);
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
  }

  // ── user_lesson_progress ─────────────────────────────────────────────────

  describe("user_lesson_progress", () => {
    // anon is denied at the privilege level now, so it errors instead of
    // returning an empty set. Either way it must never obtain a row.
    it("anon cannot read any progress", async () => {
      if (!configured) return;
      const { data, error } = await anonClient.from("user_lesson_progress").select("*");
      expect(data ?? []).toEqual([]);
      if (error === null) expect(data).toEqual([]);
    });

    // Completions are what mint certificates, so they are awarded server-side
    // only: the client may declare that it opened a lesson, nothing more.
    it("user cannot declare a lesson COMPLETED", async () => {
      if (!configured) return;
      const clientB = await signInAs(TEST_USER_B_EMAIL);
      const { error } = await clientB
        .from("user_lesson_progress")
        .update({ status: "COMPLETED" })
        .eq("userId", userBId);
      expect(error).not.toBeNull();
    });

    it("user A cannot read user B's progress", async () => {
      if (!configured) return;
      const clientA = await signInAs(TEST_USER_A_EMAIL);
      const { data, error } = await clientA
        .from("user_lesson_progress")
        .select("*")
        .eq("userId", userBId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("user B can read their own progress", async () => {
      if (!configured) return;
      const clientB = await signInAs(TEST_USER_B_EMAIL);
      const { data, error } = await clientB
        .from("user_lesson_progress")
        .select("userId, status")
        .eq("userId", userBId);
      expect(error).toBeNull();
      expect(data?.length).toBe(1);
      expect(data?.[0]?.userId).toBe(userBId);
    });
  });

  // ── lessons ───────────────────────────────────────────────────────────────

  describe("lessons", () => {
    it("anon can read published lessons", async () => {
      if (!configured) return;
      const { data, error } = await anonClient
        .from("lessons")
        .select("id, status")
        .eq("status", "PUBLISHED");
      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThan(0);
      expect(data?.every((l) => l.status === "PUBLISHED")).toBe(true);
    });

    it("anon cannot read draft lessons", async () => {
      if (!configured) return;
      const { data, error } = await anonClient.from("lessons").select("id").eq("id", draftLessonId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("authenticated student cannot read draft lessons", async () => {
      if (!configured) return;
      const clientA = await signInAs(TEST_USER_A_EMAIL);
      const { data, error } = await clientA.from("lessons").select("id").eq("id", draftLessonId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  // ── users ─────────────────────────────────────────────────────────────────

  describe("users", () => {
    it("anon can read public user profiles", async () => {
      if (!configured) return;
      const { data, error } = await anonClient
        .from("users")
        .select("id, displayName")
        .eq("id", userAId);
      expect(error).toBeNull();
      expect(data?.length).toBe(1);
    });

    it("user cannot escalate their own role to ADMIN", async () => {
      if (!configured) return;
      const clientA = await signInAs(TEST_USER_A_EMAIL);
      const { error } = await clientA.from("users").update({ role: "ADMIN" }).eq("id", userAId);
      expect(error).not.toBeNull();
    });

    // A row policy cannot hide a column: only column privileges keep email and
    // role off the Data API. Without them the anon key dumps the whole roster.
    it("anon cannot read emails", async () => {
      if (!configured) return;
      const { error } = await anonClient.from("users").select("email").eq("id", userAId);
      expect(error).not.toBeNull();
    });

    it("anon cannot read roles", async () => {
      if (!configured) return;
      const { error } = await anonClient.from("users").select("role");
      expect(error).not.toBeNull();
    });

    it("user cannot rewrite their own XP or level", async () => {
      if (!configured) return;
      const clientA = await signInAs(TEST_USER_A_EMAIL);
      const { error } = await clientA.from("users").update({ xpTotal: 999999 }).eq("id", userAId);
      expect(error).not.toBeNull();
    });
  });

  // ── placement_questions ───────────────────────────────────────────────────

  describe("placement_questions", () => {
    it("active questions are readable (needed for onboarding)", async () => {
      if (!configured) return;
      const { data, error } = await anonClient
        .from("placement_questions")
        .select("id, category")
        .eq("isActive", true);
      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThan(0);
    });

    // The answer key must never travel over the Data API - a row policy cannot
    // hide a column, so this is enforced by column privileges.
    it("the answer key is not readable", async () => {
      if (!configured) return;
      const { error } = await anonClient.from("placement_questions").select("correctOptionId");
      expect(error).not.toBeNull();
    });
  });

  // ── quiz (metadata: authenticated read OK) ──────────────────────────────────

  describe("quiz", () => {
    it("authenticated user can read quiz metadata", async () => {
      if (!configured) return;
      const clientA = await signInAs(TEST_USER_A_EMAIL);
      const { data, error } = await clientA.from("quiz").select("id, pathId").eq("id", quizId);
      expect(error).toBeNull();
      expect(data?.length).toBe(1);
    });
  });

  // ── quiz_questions (server-only: clients cannot read → answer key stays hidden)

  describe("quiz_questions", () => {
    it("anon cannot read quiz_questions", async () => {
      if (!configured) return;
      const { data, error } = await anonClient.from("quiz_questions").select("*");
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("authenticated user cannot read quiz_questions (correctOptionId stays hidden)", async () => {
      if (!configured) return;
      const clientA = await signInAs(TEST_USER_A_EMAIL);
      const { data, error } = await clientA.from("quiz_questions").select("*").eq("quizId", quizId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  // ── quiz_attempts (own read only; writes are server-only) ───────────────────

  describe("quiz_attempts", () => {
    it("user B can read their own attempt", async () => {
      if (!configured) return;
      const clientB = await signInAs(TEST_USER_B_EMAIL);
      const { data, error } = await clientB
        .from("quiz_attempts")
        .select("id, score")
        .eq("userId", userBId);
      expect(error).toBeNull();
      expect(data?.length).toBe(1);
    });

    it("user A cannot read user B's attempt", async () => {
      if (!configured) return;
      const clientA = await signInAs(TEST_USER_A_EMAIL);
      const { data, error } = await clientA.from("quiz_attempts").select("*").eq("userId", userBId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("client cannot insert an attempt (forging passed=true is server-only)", async () => {
      if (!configured) return;
      const clientA = await signInAs(TEST_USER_A_EMAIL);
      const { error } = await clientA.from("quiz_attempts").insert({
        id: randomUUID(),
        userId: userAId,
        quizId,
        score: 100,
        passed: true,
        answers: [],
      });
      expect(error).not.toBeNull(); // RLS denies: no client INSERT policy exists
    });
  });

  describe("contact_tickets", () => {
    // The honeypot, the minimum fill time, the rate limit and the Zod schema
    // all live in the contact server action. A client able to POST straight to
    // /rest/v1/contact_tickets walks past every one of them.
    // Every payload below is COMPLETE - updatedAt included. It is @updatedAt in
    // the schema, so Prisma fills it and the database has no default: omitting
    // it would make the insert fail on a NOT NULL violation and the test would
    // pass even with the grant wide open. Each case also asserts the row is
    // absent afterwards, which holds whatever the error turns out to be.
    it("anon cannot open a ticket through the Data API", async () => {
      if (!configured) return;
      const id = randomUUID();
      const { error } = await anonClient.from("contact_tickets").insert({
        id,
        email: "spam@example.com",
        subject: "spam",
        theme: "OTHER",
        message: "spam",
        updatedAt: new Date().toISOString(),
      });
      expect(error).not.toBeNull();

      const { data } = await adminClient.from("contact_tickets").select("id").eq("id", id);
      expect(data).toEqual([]);
    });

    it("an authenticated user cannot open a ticket through the Data API either", async () => {
      if (!configured) return;
      const clientA = await signInAs(TEST_USER_A_EMAIL);
      const id = randomUUID();
      const { error } = await clientA.from("contact_tickets").insert({
        id,
        userId: userAId,
        email: "spam@example.com",
        subject: "spam",
        theme: "OTHER",
        message: "spam",
        updatedAt: new Date().toISOString(),
      });
      expect(error).not.toBeNull();

      const { data } = await adminClient.from("contact_tickets").select("id").eq("id", id);
      expect(data).toEqual([]);
    });
  });

  describe("lesson Q&A", () => {
    it("a client cannot post a question through the Data API", async () => {
      if (!configured) return;
      const clientA = await signInAs(TEST_USER_A_EMAIL);
      const id = randomUUID();
      const { error } = await clientA.from("lesson_questions").insert({
        id,
        userId: userAId,
        lessonId: publishedLessonId,
        title: "direct",
        content: "posted straight to PostgREST",
        updatedAt: new Date().toISOString(),
      });
      expect(error).not.toBeNull();

      const { data } = await adminClient.from("lesson_questions").select("id").eq("id", id);
      expect(data).toEqual([]);
    });

    it("a client cannot accept its own answer or inflate its upvotes", async () => {
      if (!configured) return;
      const questionId = randomUUID();
      const answerId = randomUUID();
      // updatedAt is @updatedAt: Prisma fills it, the database has no default,
      // so a Data API insert must supply it (same as the users fixture above).
      const now = new Date().toISOString();
      const { error: questionFixtureError } = await adminClient.from("lesson_questions").insert({
        id: questionId,
        userId: userAId,
        lessonId: publishedLessonId,
        title: "rls fixture",
        content: "rls fixture",
        updatedAt: now,
      });
      const { error: answerFixtureError } = await adminClient.from("lesson_answers").insert({
        id: answerId,
        userId: userAId,
        questionId,
        content: "rls fixture",
        updatedAt: now,
      });
      // A silently failed fixture would make every assertion below vacuous.
      expect(questionFixtureError).toBeNull();
      expect(answerFixtureError).toBeNull();

      const clientA = await signInAs(TEST_USER_A_EMAIL);
      const { error } = await clientA
        .from("lesson_answers")
        .update({ isAccepted: true, upvotes: 9999 })
        .eq("id", answerId);
      expect(error).not.toBeNull();

      // The row must be untouched, whatever the client got back.
      const { data } = await adminClient
        .from("lesson_answers")
        .select("isAccepted, upvotes")
        .eq("id", answerId)
        .single();
      expect(data).toMatchObject({ isAccepted: false, upvotes: 0 });

      await adminClient.from("lesson_answers").delete().eq("id", answerId);
      await adminClient.from("lesson_questions").delete().eq("id", questionId);
    });
  });
});
