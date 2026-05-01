"use strict";
/**
 * RLS Integration Tests
 *
 * Verifies that Row Level Security policies are correctly applied.
 * Runs against the real Supabase database — requires NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to be set.
 *
 * These tests satisfy Phase 1 acceptance criterion:
 * "RLS testée : un user ne peut PAS lire les progress d'un autre user"
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supabase_js_1 = require("@supabase/supabase-js");
const node_crypto_1 = require("node:crypto");
const TEST_USER_A_EMAIL = "rls-test-a@test.cyberlearn.internal";
const TEST_USER_B_EMAIL = "rls-test-b@test.cyberlearn.internal";
const TEST_PASSWORD = "TestPassword123!";
(0, vitest_1.describe)("RLS policies (integration)", () => {
  // All vars initialized in beforeAll after setupFiles has loaded env
  let supabaseUrl;
  let supabaseAnonKey;
  let adminClient;
  let anonClient;
  let configured = false;
  let userAId;
  let userBId;
  let publishedLessonId;
  let draftLessonId;
  let createdDraftLessonId; // Created by test setup, cleaned up in afterAll
  (0, vitest_1.beforeAll)(async () => {
    supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
    supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) return;
    adminClient = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    anonClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
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
    // updatedAt is NOT NULL without default — Prisma manages it normally, we set it manually here
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
    if (!published) throw new Error("No PUBLISHED lessons — run seed first");
    publishedLessonId = published.id;
    // Create a DRAFT lesson for RLS testing (not from seed)
    if (draft) {
      draftLessonId = draft.id;
    } else {
      const { data: newDraft, error: draftErr } = await adminClient
        .from("lessons")
        .insert({
          id: (0, node_crypto_1.randomUUID)(),
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
      id: (0, node_crypto_1.randomUUID)(),
      userId: userBId,
      lessonId: publishedLessonId,
      status: "IN_PROGRESS",
      attempts: 1,
      timeSpentSeconds: 120,
    });
    if (progressInsertError)
      throw new Error(`Failed to insert progress: ${progressInsertError.message}`);
    configured = true;
  });
  (0, vitest_1.afterAll)(async () => {
    if (!configured) return;
    await adminClient.from("user_lesson_progress").delete().in("userId", [userAId, userBId]);
    if (createdDraftLessonId) {
      await adminClient.from("lessons").delete().eq("id", createdDraftLessonId);
    }
    await adminClient.from("users").delete().in("id", [userAId, userBId]);
    await adminClient.auth.admin.deleteUser(userAId);
    await adminClient.auth.admin.deleteUser(userBId);
  });
  async function signInAs(email) {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email,
      password: TEST_PASSWORD,
    });
    if (error || !data.session) throw new Error(`Sign in failed: ${error?.message}`);
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
  }
  // ── user_lesson_progress ─────────────────────────────────────────────────
  (0, vitest_1.describe)("user_lesson_progress", () => {
    (0, vitest_1.it)("anon cannot read any progress", async () => {
      if (!configured) return;
      const { data, error } = await anonClient.from("user_lesson_progress").select("*");
      (0, vitest_1.expect)(error).toBeNull();
      (0, vitest_1.expect)(data).toEqual([]);
    });
    (0, vitest_1.it)("user A cannot read user B's progress", async () => {
      if (!configured) return;
      const clientA = await signInAs(TEST_USER_A_EMAIL);
      const { data, error } = await clientA
        .from("user_lesson_progress")
        .select("*")
        .eq("userId", userBId);
      (0, vitest_1.expect)(error).toBeNull();
      (0, vitest_1.expect)(data).toEqual([]);
    });
    (0, vitest_1.it)("user B can read their own progress", async () => {
      if (!configured) return;
      const clientB = await signInAs(TEST_USER_B_EMAIL);
      const { data, error } = await clientB
        .from("user_lesson_progress")
        .select("userId, status")
        .eq("userId", userBId);
      (0, vitest_1.expect)(error).toBeNull();
      (0, vitest_1.expect)(data?.length).toBe(1);
      (0, vitest_1.expect)(data?.[0]?.userId).toBe(userBId);
    });
  });
  // ── lessons ───────────────────────────────────────────────────────────────
  (0, vitest_1.describe)("lessons", () => {
    (0, vitest_1.it)("anon can read published lessons", async () => {
      if (!configured) return;
      const { data, error } = await anonClient
        .from("lessons")
        .select("id, status")
        .eq("status", "PUBLISHED");
      (0, vitest_1.expect)(error).toBeNull();
      (0, vitest_1.expect)(data?.length).toBeGreaterThan(0);
      (0, vitest_1.expect)(data?.every((l) => l.status === "PUBLISHED")).toBe(true);
    });
    (0, vitest_1.it)("anon cannot read draft lessons", async () => {
      if (!configured) return;
      const { data, error } = await anonClient.from("lessons").select("id").eq("id", draftLessonId);
      (0, vitest_1.expect)(error).toBeNull();
      (0, vitest_1.expect)(data).toEqual([]);
    });
    (0, vitest_1.it)("authenticated student cannot read draft lessons", async () => {
      if (!configured) return;
      const clientA = await signInAs(TEST_USER_A_EMAIL);
      const { data, error } = await clientA.from("lessons").select("id").eq("id", draftLessonId);
      (0, vitest_1.expect)(error).toBeNull();
      (0, vitest_1.expect)(data).toEqual([]);
    });
  });
  // ── users ─────────────────────────────────────────────────────────────────
  (0, vitest_1.describe)("users", () => {
    (0, vitest_1.it)("anon can read public user profiles", async () => {
      if (!configured) return;
      const { data, error } = await anonClient
        .from("users")
        .select("id, displayName")
        .eq("id", userAId);
      (0, vitest_1.expect)(error).toBeNull();
      (0, vitest_1.expect)(data?.length).toBe(1);
    });
    (0, vitest_1.it)("user cannot escalate their own role to ADMIN", async () => {
      if (!configured) return;
      const clientA = await signInAs(TEST_USER_A_EMAIL);
      const { error } = await clientA.from("users").update({ role: "ADMIN" }).eq("id", userAId);
      (0, vitest_1.expect)(error).not.toBeNull();
    });
  });
  // ── placement_questions ───────────────────────────────────────────────────
  (0, vitest_1.describe)("placement_questions", () => {
    (0, vitest_1.it)("active questions are readable (needed for onboarding)", async () => {
      if (!configured) return;
      const { data, error } = await anonClient
        .from("placement_questions")
        .select("id, category")
        .eq("isActive", true);
      (0, vitest_1.expect)(error).toBeNull();
      (0, vitest_1.expect)(data?.length).toBeGreaterThan(0);
    });
  });
});
//# sourceMappingURL=rls.integration.test.js.map
