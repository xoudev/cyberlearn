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
export {};
//# sourceMappingURL=storage-rls.integration.test.d.ts.map
