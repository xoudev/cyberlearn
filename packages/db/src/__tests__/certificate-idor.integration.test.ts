/**
 * Certificate IDOR Integration Test
 *
 * Verifies that the ownership + revocation filter in the certificate download
 * query prevents cross-user access (IDOR). Runs against the real database.
 *
 * Acceptance criterion for PR 1.1:
 *   findFirst({ where: { id, userId: wrongUser, revokedAt: null } }) → null
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { prisma } from "../prisma.js";
import { certificateRepository } from "../repositories/certificate.repository.js";

const USER_A_EMAIL = "idor-cert-a@test.cyberlearn.internal";
const USER_B_EMAIL = "idor-cert-b@test.cyberlearn.internal";
const TEST_PASSWORD = "TestPassword123!";

describe("Certificate IDOR - ownership query filter (integration)", () => {
  let adminClient: SupabaseClient;
  let configured = false;
  let supabaseUrl: string;
  let supabaseAnonKey: string;
  let userAId: string;
  let userBId: string;
  let pathId: string;
  let certBId: string;
  let certBPublicId: string;

  beforeAll(async () => {
    supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
    supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) return;

    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Idempotent cleanup from previous interrupted runs
    for (const email of [USER_A_EMAIL, USER_B_EMAIL]) {
      const { data } = await adminClient.auth.admin.listUsers();
      const existing = data.users.find((u) => u.email === email);
      if (existing) {
        await adminClient.from("certificates").delete().eq("userId", existing.id);
        await adminClient.from("users").delete().eq("id", existing.id);
        await adminClient.auth.admin.deleteUser(existing.id);
      }
    }

    const { data: aData, error: aErr } = await adminClient.auth.admin.createUser({
      email: USER_A_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    const { data: bData, error: bErr } = await adminClient.auth.admin.createUser({
      email: USER_B_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (aErr ?? !aData.user) throw new Error(`User A: ${aErr?.message}`);
    if (bErr ?? !bData.user) throw new Error(`User B: ${bErr?.message}`);

    userAId = aData.user.id;
    userBId = bData.user.id;

    const now = new Date().toISOString();
    await adminClient.from("users").insert([
      { id: userAId, email: USER_A_EMAIL, displayName: "IDOR Cert A", updatedAt: now },
      { id: userBId, email: USER_B_EMAIL, displayName: "IDOR Cert B", updatedAt: now },
    ]);

    // Create a minimal path to satisfy the FK on certificates
    const path = await prisma.path.create({
      data: {
        refCode: "CL-PATH-IDOR-V01",
        slug: `idor-test-path-${randomUUID().slice(0, 8)}`,
        title: "IDOR Test Path",
        description: "Ephemeral path created for certificate IDOR test",
        category: "CYBERSEC",
        difficulty: "BEGINNER",
        estimatedHours: 1,
        status: "DRAFT",
      },
    });
    pathId = path.id;

    // Certificate owned by user B - this is what user A must NOT be able to access
    const cert = await prisma.certificate.create({
      data: {
        userId: userBId,
        pathId,
        sha256Hash: `test-idor-hash-${randomUUID()}`,
        pdfStorageKey: `certificates/test-${randomUUID()}.pdf`,
      },
    });
    certBId = cert.id;
    certBPublicId = cert.publicId;

    configured = true;
  });

  async function signInAs(email: string): Promise<SupabaseClient> {
    const signer = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await signer.auth.signInWithPassword({
      email,
      password: TEST_PASSWORD,
    });
    if (error || !data.session) throw new Error(`Sign in failed: ${error?.message}`);
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
  }

  afterAll(async () => {
    if (!configured) return;
    await prisma.certificate.deleteMany({ where: { pathId } });
    await prisma.path.delete({ where: { id: pathId } });
    await adminClient.from("users").delete().in("id", [userAId, userBId]);
    await adminClient.auth.admin.deleteUser(userAId);
    await adminClient.auth.admin.deleteUser(userBId);
  });

  it("user A cannot access user B's certificate (IDOR blocked)", async () => {
    if (!configured) return;
    const result = await prisma.certificate.findFirst({
      where: { id: certBId, userId: userAId, revokedAt: null },
      select: { pdfStorageKey: true },
    });
    expect(result).toBeNull();
  });

  it("user B can access their own certificate", async () => {
    if (!configured) return;
    const result = await prisma.certificate.findFirst({
      where: { id: certBId, userId: userBId, revokedAt: null },
      select: { pdfStorageKey: true },
    });
    expect(result).not.toBeNull();
    expect(result?.pdfStorageKey).toMatch(/^certificates\/test-/);
  });

  // The app's home screen counts the holder's certificates through the Data
  // API (apps/mobile/lib/queries.ts). It counted on `id`, which the column
  // grants leave out: every count was refused and drawn as 0.
  it("the holder counts their certificates through the Data API, on a granted column", async () => {
    if (!configured) return;
    const clientB = await signInAs(USER_B_EMAIL);
    const counted = await clientB
      .from("certificates")
      .select("publicId", { count: "exact", head: true })
      .eq("userId", userBId)
      .is("revokedAt", null);
    expect(counted.error).toBeNull();
    expect(counted.count).toBe(1);
  });

  it("finds a certificate by the start of its public id, as the PDF prints it", async () => {
    if (!configured) return;
    const found = await certificateRepository.findByPublicIdPrefix(certBPublicId.slice(0, 8));
    expect(found.map((c) => c.publicId)).toContain(certBPublicId);
  });

  it("revoked certificate is not accessible even by owner", async () => {
    if (!configured) return;
    await prisma.certificate.update({
      where: { id: certBId },
      data: { revokedAt: new Date(), revokedReason: "test revocation" },
    });
    const result = await prisma.certificate.findFirst({
      where: { id: certBId, userId: userBId, revokedAt: null },
      select: { pdfStorageKey: true },
    });
    expect(result).toBeNull();
  });

  // The app shows a revoked certificate with its reason, as the site does
  // (20261017140000_certificate_revocation grants the column).
  it("the holder reads why their certificate was revoked, through the Data API", async () => {
    if (!configured) return;
    const clientB = await signInAs(USER_B_EMAIL);
    const read = await clientB
      .from("certificates")
      .select("publicId,revokedAt,revokedReason")
      .eq("publicId", certBPublicId);
    expect(read.error).toBeNull();
    expect(read.data?.[0]?.revokedReason).toBe("test revocation");
  });

  it("another account reads no one else's revocation", async () => {
    if (!configured) return;
    const clientA = await signInAs(USER_A_EMAIL);
    const read = await clientA
      .from("certificates")
      .select("publicId,revokedReason")
      .eq("publicId", certBPublicId);
    expect(read.error).toBeNull();
    expect(read.data).toEqual([]);
  });

  it("revokes once from the console, however many times it is asked", async () => {
    if (!configured) return;
    await prisma.certificate.update({
      where: { id: certBId },
      data: { revokedAt: null, revokedReason: null },
    });
    const notice = { title: "Certificat révoqué : test", body: "Motif : test", actionUrl: "/x" };
    const first = await certificateRepository.revoke({
      id: certBId,
      reason: "Premier motif",
      actorId: userAId,
      now: new Date(),
      notice,
    });
    const second = await certificateRepository.revoke({
      id: certBId,
      reason: "Second motif",
      actorId: userAId,
      now: new Date(),
      notice,
    });
    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: false, reason: "ALREADY_REVOKED" });

    const row = await prisma.certificate.findUnique({
      where: { id: certBId },
      select: { revokedReason: true },
    });
    expect(row?.revokedReason).toBe("Premier motif");
    const traces = await prisma.auditLog.count({
      where: { targetType: "Certificate", targetId: certBId },
    });
    expect(traces).toBe(1);
    const notices = await prisma.notification.count({
      where: { userId: userBId, type: "CERTIFICATE_REVOKED" },
    });
    expect(notices).toBe(1);

    await prisma.auditLog.deleteMany({ where: { targetType: "Certificate", targetId: certBId } });
  });
});
