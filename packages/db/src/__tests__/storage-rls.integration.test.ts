/**
 * Storage RLS Integration Tests - PR 1.2
 *
 * Verifies that the certificates bucket is unreachable by anon/authenticated
 * clients and remains accessible to the service_role backend.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *           SUPABASE_SERVICE_ROLE_KEY (skips silently if absent).
 *
 * Run: pnpm --filter @cyberlearn/db test storage-rls
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const TEST_USER_EMAIL = "storage-rls-test@test.cyberlearn.internal";
const TEST_PASSWORD = "TestPassword123!";

// Sentinel file uploaded by service_role; all non-service_role reads must fail.
// Random suffix prevents collisions across parallel runs.
const SENTINEL_KEY = `__sentinel/${randomUUID()}.pdf`;

describe("Storage RLS - certificates bucket (integration)", () => {
  let supabaseUrl: string;
  let supabaseAnonKey: string;
  let adminClient: SupabaseClient;
  let anonClient: SupabaseClient;
  let configured = false;
  let testUserId: string;

  beforeAll(async () => {
    supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
    supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) return;

    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    anonClient = createClient(supabaseUrl, supabaseAnonKey);

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
    await adminClient.from("users").insert({
      id: testUserId,
      email: TEST_USER_EMAIL,
      displayName: "Storage RLS Test",
      updatedAt: now,
    });

    // Upload sentinel via service_role - this proves the file EXISTS in the bucket.
    // If the RLS policies work, regular clients will not be able to see or read it.
    // Minimal PDF header: Supabase validates content-type against the bucket MIME allowlist.
    const blob = new Blob(
      [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])], // %PDF-1.4
      { type: "application/pdf" },
    );
    const { error: uploadError } = await adminClient.storage
      .from("certificates")
      .upload(SENTINEL_KEY, blob, { contentType: "application/pdf" });
    if (uploadError) throw new Error(`Sentinel upload failed: ${uploadError.message}`);

    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await adminClient.storage.from("certificates").remove([SENTINEL_KEY]);
    await adminClient.from("users").delete().eq("id", testUserId);
    await adminClient.auth.admin.deleteUser(testUserId);
  });

  // Helper: return a client authenticated as the test user
  async function signInAsTestUser(): Promise<SupabaseClient> {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_PASSWORD,
    });
    if (error ?? !data.session) throw new Error(`Sign-in failed: ${error?.message}`);
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
  }

  it("anon client cannot download from certificates bucket", async () => {
    if (!configured) return;
    // Anon download must fail - the RLS SELECT policy blocks all rows in this bucket.
    const { data, error } = await anonClient.storage.from("certificates").download(SENTINEL_KEY);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("authenticated client cannot list the certificates bucket", async () => {
    if (!configured) return;
    // The sentinel file exists (confirmed by service_role upload above).
    // If RLS works, this list returns empty - not the sentinel row.
    const authClient = await signInAsTestUser();
    const { data } = await authClient.storage.from("certificates").list("__sentinel");
    // Either null (policy error) or empty array (policy filters all rows)
    const files = data ?? [];
    expect(files.find((f) => f.name.endsWith(".pdf"))).toBeUndefined();
  });

  it("authenticated client cannot download from certificates bucket", async () => {
    if (!configured) return;
    const authClient = await signInAsTestUser();
    const { data, error } = await authClient.storage.from("certificates").download(SENTINEL_KEY);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("service_role bypasses RLS and can list the certificates bucket", async () => {
    if (!configured) return;
    // service_role ignores RLS - this is the mechanism our server-side code relies on.
    const { data, error } = await adminClient.storage.from("certificates").list("__sentinel");
    expect(error).toBeNull();
    // The sentinel file must be visible to service_role
    expect(data?.find((f) => f.name.endsWith(".pdf"))).toBeDefined();
  });
});
