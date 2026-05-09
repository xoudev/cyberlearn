"use strict";
/**
 * Certificate IDOR Integration Test
 *
 * Verifies that the ownership + revocation filter in the certificate download
 * query prevents cross-user access (IDOR). Runs against the real database.
 *
 * Acceptance criterion for PR 1.1:
 *   findFirst({ where: { id, userId: wrongUser, revokedAt: null } }) → null
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supabase_js_1 = require("@supabase/supabase-js");
const node_crypto_1 = require("node:crypto");
const prisma_js_1 = require("../prisma.js");
const USER_A_EMAIL = "idor-cert-a@test.cyberlearn.internal";
const USER_B_EMAIL = "idor-cert-b@test.cyberlearn.internal";
const TEST_PASSWORD = "TestPassword123!";
(0, vitest_1.describe)("Certificate IDOR — ownership query filter (integration)", () => {
  let adminClient;
  let configured = false;
  let userAId;
  let userBId;
  let pathId;
  let certBId;
  (0, vitest_1.beforeAll)(async () => {
    const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
    if (!supabaseUrl || !serviceRoleKey) return;
    adminClient = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
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
    const path = await prisma_js_1.prisma.path.create({
      data: {
        refCode: "CL-PATH-IDOR-V01",
        slug: `idor-test-path-${(0, node_crypto_1.randomUUID)().slice(0, 8)}`,
        title: "IDOR Test Path",
        description: "Ephemeral path created for certificate IDOR test",
        category: "CYBERSEC",
        difficulty: "BEGINNER",
        estimatedHours: 1,
        status: "DRAFT",
      },
    });
    pathId = path.id;
    // Certificate owned by user B — this is what user A must NOT be able to access
    const cert = await prisma_js_1.prisma.certificate.create({
      data: {
        userId: userBId,
        pathId,
        sha256Hash: `test-idor-hash-${(0, node_crypto_1.randomUUID)()}`,
        pdfStorageKey: `certificates/test-${(0, node_crypto_1.randomUUID)()}.pdf`,
      },
    });
    certBId = cert.id;
    configured = true;
  });
  (0, vitest_1.afterAll)(async () => {
    if (!configured) return;
    await prisma_js_1.prisma.certificate.deleteMany({ where: { pathId } });
    await prisma_js_1.prisma.path.delete({ where: { id: pathId } });
    await adminClient.from("users").delete().in("id", [userAId, userBId]);
    await adminClient.auth.admin.deleteUser(userAId);
    await adminClient.auth.admin.deleteUser(userBId);
  });
  (0, vitest_1.it)("user A cannot access user B's certificate (IDOR blocked)", async () => {
    if (!configured) return;
    const result = await prisma_js_1.prisma.certificate.findFirst({
      where: { id: certBId, userId: userAId, revokedAt: null },
      select: { pdfStorageKey: true },
    });
    (0, vitest_1.expect)(result).toBeNull();
  });
  (0, vitest_1.it)("user B can access their own certificate", async () => {
    if (!configured) return;
    const result = await prisma_js_1.prisma.certificate.findFirst({
      where: { id: certBId, userId: userBId, revokedAt: null },
      select: { pdfStorageKey: true },
    });
    (0, vitest_1.expect)(result).not.toBeNull();
    (0, vitest_1.expect)(result?.pdfStorageKey).toMatch(/^certificates\/test-/);
  });
  (0, vitest_1.it)("revoked certificate is not accessible even by owner", async () => {
    if (!configured) return;
    await prisma_js_1.prisma.certificate.update({
      where: { id: certBId },
      data: { revokedAt: new Date(), revokedReason: "test revocation" },
    });
    const result = await prisma_js_1.prisma.certificate.findFirst({
      where: { id: certBId, userId: userBId, revokedAt: null },
      select: { pdfStorageKey: true },
    });
    (0, vitest_1.expect)(result).toBeNull();
  });
});
//# sourceMappingURL=certificate-idor.integration.test.js.map
