/**
 * Storage RLS Integration Tests - a public bucket is public to read, and only
 * to read.
 *
 * The certificates policies are permissive `<> 'certificates'`, which granted
 * anon every operation on any other bucket; the public "Badge" bucket (badge
 * icons) could be listed, and written, with the public anon key.
 * 20260926_storage_client_access_blocked.sql shuts clients out of Storage
 * altogether. These tests hold that: the icon is served at its public URL, and
 * nothing else is reachable without service_role.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *           SUPABASE_SERVICE_ROLE_KEY, and a public "Badge" bucket
 *           (provisioned by CI). Skips silently if absent.
 *
 * Run: pnpm --filter @cyberlearn/db test storage-public-bucket
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const BUCKET = "Badge";
const SENTINEL_KEY = `__sentinel/${randomUUID()}.svg`;
const SENTINEL_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>';

function svg(body: string): Blob {
  return new Blob([body], { type: "image/svg+xml" });
}

describe("Storage RLS - public Badge bucket (integration)", () => {
  let supabaseUrl: string;
  let adminClient: SupabaseClient;
  let anonClient: SupabaseClient;
  let configured = false;

  beforeAll(async () => {
    supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
    const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return;

    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    anonClient = createClient(supabaseUrl, anonKey);

    const { data: bucket } = await adminClient.storage.getBucket(BUCKET);
    if (!bucket?.public) return;

    const { error } = await adminClient.storage
      .from(BUCKET)
      .upload(SENTINEL_KEY, svg(SENTINEL_SVG), {
        contentType: "image/svg+xml",
      });
    if (error) throw new Error(`Sentinel upload failed: ${error.message}`);
    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await adminClient.storage.from(BUCKET).remove([SENTINEL_KEY]);
  });

  it("serves an icon at its public URL, which is how the site and the app draw it", async () => {
    if (!configured) return;
    const res = await fetch(`${supabaseUrl}/storage/v1/object/public/${BUCKET}/${SENTINEL_KEY}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(SENTINEL_SVG);
  });

  it("does not let the anon key list the bucket", async () => {
    if (!configured) return;
    const { data } = await anonClient.storage.from(BUCKET).list("__sentinel");
    expect((data ?? []).find((f) => SENTINEL_KEY.endsWith(f.name))).toBeUndefined();
  });

  it("does not let the anon key upload a new file", async () => {
    if (!configured) return;
    const key = `__sentinel/${randomUUID()}.svg`;
    const { error } = await anonClient.storage.from(BUCKET).upload(key, svg(SENTINEL_SVG), {
      contentType: "image/svg+xml",
    });
    expect(error).not.toBeNull();
    // Nothing landed, whatever the error said.
    const { data } = await adminClient.storage.from(BUCKET).list("__sentinel");
    expect((data ?? []).find((f) => key.endsWith(f.name))).toBeUndefined();
  });

  it("does not let the anon key replace an icon", async () => {
    if (!configured) return;
    await anonClient.storage.from(BUCKET).upload(SENTINEL_KEY, svg("<svg>replaced</svg>"), {
      contentType: "image/svg+xml",
      upsert: true,
    });
    // A fresh query string, so no cache in between answers with the old copy.
    const res = await fetch(
      `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${SENTINEL_KEY}?t=${String(Date.now())}`,
    );
    expect(await res.text()).toBe(SENTINEL_SVG);
  });

  it("does not let the anon key delete an icon", async () => {
    if (!configured) return;
    await anonClient.storage.from(BUCKET).remove([SENTINEL_KEY]);
    const { data } = await adminClient.storage.from(BUCKET).list("__sentinel");
    expect((data ?? []).find((f) => SENTINEL_KEY.endsWith(f.name))).toBeDefined();
  });
});
