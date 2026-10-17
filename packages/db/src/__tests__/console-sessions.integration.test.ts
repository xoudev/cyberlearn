/**
 * "Déconnecter toutes les sessions", from the console, on the real stack.
 *
 * The console has no token of the account to sign it out with, so the
 * repository deletes its rows in auth.sessions. What has to hold: the
 * database role Prisma connects with may do that, every session of the
 * account goes and no other's, no refresh token renews one, and a token
 * already issued no longer passes Supabase's own check of the session
 * (getUser, which the site and the app run on every request).
 *
 * Skips gracefully when the Supabase or database variables are absent, like
 * the other integration specs. Accounts and rows are removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { userRepository } from "../repositories/user.repository.js";

const EMAIL = "console-sessions@test.cyberlearn.internal";
const BYSTANDER_EMAIL = "console-sessions-bystander@test.cyberlearn.internal";
const PASSWORD = "TestPassword123!";

describe("userRepository.revokeAllSessions (integration)", () => {
  let url = "";
  let anonKey = "";
  let admin: SupabaseClient;
  let configured = false;
  let userId = "";
  let bystanderId = "";
  const actorId = randomUUID();

  /** The auth client of a fresh anon-key client, as a browser or the app holds one. */
  function anonAuth(): SupabaseClient["auth"] {
    return createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }).auth;
  }

  async function signIn(email: string): Promise<Session> {
    const { data, error } = await anonAuth().signInWithPassword({ email, password: PASSWORD });
    if (error || !data.session) throw new Error(`Sign in failed: ${error?.message}`);
    return data.session;
  }

  async function sessionCount(id: string): Promise<number> {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      SELECT count(*)::int AS count FROM auth.sessions WHERE user_id = ${id}::uuid`;
    return rows[0]?.count ?? -1;
  }

  async function cleanup(): Promise<void> {
    const { data } = await admin.auth.admin.listUsers();
    for (const email of [EMAIL, BYSTANDER_EMAIL]) {
      const existing = data.users.find((u) => u.email === email);
      if (existing) {
        await prisma.auditLog.deleteMany({ where: { targetId: existing.id } });
        await prisma.user.deleteMany({ where: { id: existing.id } });
        await admin.auth.admin.deleteUser(existing.id);
      }
    }
    await prisma.user.deleteMany({ where: { id: actorId } });
  }

  async function createAccount(email: string): Promise<string> {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`user: ${error?.message}`);
    await prisma.user.create({ data: { id: data.user.id, email, displayName: "Sessions" } });
    return data.user.id;
  }

  beforeAll(async () => {
    url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
    anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
    const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
    if (!url || !anonKey || !serviceKey || !process.env["DATABASE_URL"]) return;

    admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await cleanup();

    userId = await createAccount(EMAIL);
    bystanderId = await createAccount(BYSTANDER_EMAIL);
    // The administrator who presses the button: the audit row points at them.
    await prisma.user.create({
      data: {
        id: actorId,
        email: `console-sessions-actor-${actorId.slice(0, 8)}@t.internal`,
        displayName: "Admin",
        role: "ADMIN",
      },
    });
    configured = true;
  });

  afterAll(async () => {
    if (admin) await cleanup();
  });

  it("closes every session of the account, and only its own", async () => {
    if (!configured) return;
    const phone = await signIn(EMAIL);
    await signIn(EMAIL);
    await signIn(BYSTANDER_EMAIL);
    expect(await sessionCount(userId)).toBe(2);

    const revoked = await userRepository.revokeAllSessions(userId, { actorId });

    expect(revoked).toBe(2);
    expect(await sessionCount(userId)).toBe(0);
    expect(await sessionCount(bystanderId)).toBe(1);

    // No refresh token renews a closed session.
    const renewed = await anonAuth().refreshSession({ refresh_token: phone.refresh_token });
    expect(renewed.error).not.toBeNull();
    // A token already issued no longer passes the check the site makes.
    const read = await anonAuth().getUser(phone.access_token);
    expect(read.error).not.toBeNull();
  });

  it("writes who did it, and how many sessions went", async () => {
    if (!configured) return;
    await signIn(EMAIL);
    await userRepository.revokeAllSessions(userId, { actorId });

    const rows = await prisma.auditLog.findMany({
      where: { action: "admin.user.sessions.revoked", targetId: userId },
      orderBy: { createdAt: "desc" },
      select: { actorId: true, metadata: true },
    });
    expect(rows[0]).toEqual({ actorId, metadata: { sessionsRevoked: 1 } });
  });

  it("answers zero for an account with no session open", async () => {
    if (!configured) return;
    await userRepository.revokeAllSessions(userId, { actorId });
    await expect(userRepository.revokeAllSessions(userId, { actorId })).resolves.toBe(0);
  });
});
