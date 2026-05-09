/**
 * Certificate IDOR Integration Test
 *
 * Verifies that the ownership + revocation filter in the certificate download
 * query prevents cross-user access (IDOR). Runs against the real database.
 *
 * Acceptance criterion for PR 1.1:
 *   findFirst({ where: { id, userId: wrongUser, revokedAt: null } }) → null
 */
export {};
//# sourceMappingURL=certificate-idor.integration.test.d.ts.map
