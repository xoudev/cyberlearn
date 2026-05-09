"use strict";
/**
 * Storage RLS Integration Tests — PR 1.2
 *
 * Verifies that the certificates bucket is unreachable by anon/authenticated
 * clients and remains accessible to the service_role backend.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *           SUPABASE_SERVICE_ROLE_KEY (skips silently if absent).
 *
 * Run: pnpm --filter @cyberlearn/db test storage-rls
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supabase_js_1 = require("@supabase/supabase-js");
const node_crypto_1 = require("node:crypto");
const TEST_USER_EMAIL = "storage-rls-test@test.cyberlearn.internal";
const TEST_PASSWORD = "TestPassword123!";
// Sentinel file uploaded by service_role; all non-service_role reads must fail.
// Random suffix prevents collisions across parallel runs.
const SENTINEL_KEY = `storage-rls-test/sentinel-${(0, node_crypto_1.randomUUID)()}.txt`;
const SENTINEL_CONTENT = "storage-rls-sentinel";
(0, vitest_1.describe)("Storage RLS — certificates bucket (integration)", () => {
  let supabaseUrl;
  let supabaseAnonKey;
  let adminClient;
  let anonClient;
  let configured = false;
  let testUserId;
  (0, vitest_1.beforeAll)(async () => {
    supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
    supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) return;
    adminClient = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    anonClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
    // Idempotent cleanup from a previous interrupted run
    const { data: existing } = await adminClient.auth.admin.listUsers();
    const leftover = existing.users.find((u) => u.email === TEST_USER_EMAIL);
    if (leftover) {
      await adminClient.from("users").delete().eq("id", leftover.id);
      await adminClient.auth.admin.deleteUser(leftover.id);
    }
    // Create an isolated test user
    const { data, error } = await adminClient.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error ?? !data.user) throw new Error(`Failed to create test user: ${error?.message}`);
    testUserId = data.user.id;
    const now = new Date().toISOString();
    await adminClient
      .from("users")
      .insert({
        id: testUserId,
        email: TEST_USER_EMAIL,
        displayName: "Storage RLS Test",
        updatedAt: now,
      });
    // Upload sentinel via service_role — this proves the file EXISTS in the bucket.
    // If the RLS policies work, regular clients will not be able to see or read it.
    const blob = new Blob([SENTINEL_CONTENT], { type: "text/plain" });
    const { error: uploadError } = await adminClient.storage
      .from("certificates")
      .upload(SENTINEL_KEY, blob, { contentType: "text/plain" });
    if (uploadError) throw new Error(`Sentinel upload failed: ${uploadError.message}`);
    configured = true;
  });
  (0, vitest_1.afterAll)(async () => {
    if (!configured) return;
    await adminClient.storage.from("certificates").remove([SENTINEL_KEY]);
    await adminClient.from("users").delete().eq("id", testUserId);
    await adminClient.auth.admin.deleteUser(testUserId);
  });
  // Helper: return a client authenticated as the test user
  async function signInAsTestUser() {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_PASSWORD,
    });
    if (error ?? !data.session) throw new Error(`Sign-in failed: ${error?.message}`);
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
  }
  (0, vitest_1.it)("anon client cannot download from certificates bucket", async () => {
    if (!configured) return;
    // Anon download must fail — the RLS SELECT policy blocks all rows in this bucket.
    const { data, error } = await anonClient.storage.from("certificates").download(SENTINEL_KEY);
    (0, vitest_1.expect)(data).toBeNull();
    (0, vitest_1.expect)(error).not.toBeNull();
  });
  (0, vitest_1.it)("authenticated client cannot list the certificates bucket", async () => {
    if (!configured) return;
    // The sentinel file exists (confirmed by service_role upload above).
    // If RLS works, this list returns empty — not the sentinel row.
    const authClient = await signInAsTestUser();
    const { data } = await authClient.storage.from("certificates").list("storage-rls-test");
    // Either null (policy error) or empty array (policy filters all rows)
    const files = data ?? [];
    (0, vitest_1.expect)(files.find((f) => f.name.startsWith("sentinel-"))).toBeUndefined();
  });
  (0, vitest_1.it)("authenticated client cannot download from certificates bucket", async () => {
    if (!configured) return;
    const authClient = await signInAsTestUser();
    const { data, error } = await authClient.storage.from("certificates").download(SENTINEL_KEY);
    (0, vitest_1.expect)(data).toBeNull();
    (0, vitest_1.expect)(error).not.toBeNull();
  });
  (0, vitest_1.it)("service_role bypasses RLS and can list the certificates bucket", async () => {
    if (!configured) return;
    // service_role ignores RLS — this is the mechanism our server-side code relies on.
    const { data, error } = await adminClient.storage.from("certificates").list("storage-rls-test");
    (0, vitest_1.expect)(error).toBeNull();
    // The sentinel file must be visible
    (0, vitest_1.expect)(data?.find((f) => f.name.startsWith("sentinel-"))).toBeDefined();
  });
});
//# sourceMappingURL=storage-rls.integration.test.js.map
