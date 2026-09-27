/**
 * path_modules over the Data API (the mobile app reads paths through it).
 *
 * A module is read like the lessons of its path: a catalogue path's modules by
 * anyone signed in, a class path's only by its class. Nobody writes one from a
 * client.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const EMAIL = "path-modules-rls@test.cyberlearn.internal";
const PASSWORD = "TestPassword123!";
const CATALOGUE_REF = "CL-PATH-T01-V01";
const CLASS_REF = "CL-PATH-T02-V01";

describe("path_modules RLS (integration)", () => {
  let url = "";
  let anonKey = "";
  let admin: SupabaseClient;
  let configured = false;
  let userId = "";
  let catalogueModuleId = "";
  let classModuleId = "";

  async function cleanup(): Promise<void> {
    await admin.from("paths").delete().in("refCode", [CATALOGUE_REF, CLASS_REF]);
    const { data } = await admin.auth.admin.listUsers();
    const existing = data.users.find((u) => u.email === EMAIL);
    if (existing) {
      await admin.from("users").delete().eq("id", existing.id);
      await admin.auth.admin.deleteUser(existing.id);
    }
  }

  async function insertPathWithModule(
    refCode: string,
    audience: "CATALOGUE" | "CLASS",
  ): Promise<string> {
    const now = new Date().toISOString();
    const pathId = randomUUID();
    const { error: pathError } = await admin.from("paths").insert({
      id: pathId,
      refCode,
      slug: `rls-modules-${refCode.toLowerCase()}`,
      title: `RLS modules ${audience}`,
      description: "Used only by the path_modules RLS test",
      category: "NETWORK",
      difficulty: "BEGINNER",
      estimatedHours: 1,
      status: "PUBLISHED",
      audience,
      updatedAt: now,
    });
    if (pathError) throw new Error(`path: ${pathError.message}`);
    const moduleId = randomUUID();
    const { error: moduleError } = await admin.from("path_modules").insert({
      id: moduleId,
      pathId,
      position: 1,
      title: "L'adressage",
      updatedAt: now,
    });
    if (moduleError) throw new Error(`module: ${moduleError.message}`);
    return moduleId;
  }

  async function signIn(): Promise<SupabaseClient> {
    const signer = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await signer.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    });
    if (error || !data.session) throw new Error(`Sign in failed: ${error?.message}`);
    return createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
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

    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`user: ${error?.message}`);
    userId = data.user.id;
    const { error: rowError } = await admin.from("users").insert({
      id: userId,
      email: EMAIL,
      displayName: "RLS path modules",
      updatedAt: new Date().toISOString(),
    });
    if (rowError) throw new Error(`users row: ${rowError.message}`);

    catalogueModuleId = await insertPathWithModule(CATALOGUE_REF, "CATALOGUE");
    classModuleId = await insertPathWithModule(CLASS_REF, "CLASS");
    configured = true;
  });

  afterAll(async () => {
    if (admin) await cleanup();
  });

  it("lets anyone signed in read a catalogue path's modules", async () => {
    if (!configured) return;
    const client = await signIn();
    const { data, error } = await client
      .from("path_modules")
      .select("id,title")
      .eq("id", catalogueModuleId);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: catalogueModuleId, title: "L'adressage" }]);
  });

  it("hides a class path's modules from someone outside the class", async () => {
    if (!configured) return;
    const client = await signIn();
    const { data } = await client.from("path_modules").select("id").eq("id", classModuleId);
    expect(data ?? []).toEqual([]);
  });

  it("gives the anonymous role nothing", async () => {
    if (!configured) return;
    const anon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await anon
      .from("path_modules")
      .select("id")
      .eq("id", catalogueModuleId);
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("refuses a write from a signed-in client", async () => {
    if (!configured) return;
    const client = await signIn();
    const { error } = await client
      .from("path_modules")
      .update({ title: "Réécrit" })
      .eq("id", catalogueModuleId);
    expect(error).not.toBeNull();
    const { data } = await admin
      .from("path_modules")
      .select("title")
      .eq("id", catalogueModuleId)
      .single();
    expect(data?.title).toBe("L'adressage");
  });
});
