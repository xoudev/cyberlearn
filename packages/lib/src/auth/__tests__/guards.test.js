"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const guards_js_1 = require("../guards.js");
// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeSupabase(user) {
  return {
    auth: {
      getUser: vitest_1.vi.fn().mockResolvedValue({ data: { user } }),
    },
  };
}
// Next.js 15 throws these special error messages from redirect() / notFound().
// We match against them to verify the correct branch was taken.
const REDIRECT_ERROR = "NEXT_REDIRECT";
const NOT_FOUND_ERROR = "NEXT_HTTP_ERROR_FALLBACK;404";
// ─── requireUser ─────────────────────────────────────────────────────────────
(0, vitest_1.describe)("requireUser", () => {
  (0, vitest_1.it)("returns the user when authenticated", async () => {
    const supabase = makeSupabase({
      id: "user-123",
      email: "test@example.com",
      app_metadata: { user_role: "USER" },
    });
    const result = await (0, guards_js_1.requireUser)(supabase);
    (0, vitest_1.expect)(result).toEqual({
      id: "user-123",
      email: "test@example.com",
      role: "USER",
    });
  });
  (0, vitest_1.it)("extracts role from app_metadata.user_role", async () => {
    const supabase = makeSupabase({
      id: "admin-456",
      email: "admin@example.com",
      app_metadata: { user_role: "ADMIN" },
    });
    const result = await (0, guards_js_1.requireUser)(supabase);
    (0, vitest_1.expect)(result.role).toBe("ADMIN");
  });
  (0, vitest_1.it)("returns undefined role when app_metadata is absent", async () => {
    const supabase = makeSupabase({ id: "user-789", email: "noRole@example.com" });
    const result = await (0, guards_js_1.requireUser)(supabase);
    (0, vitest_1.expect)(result.role).toBeUndefined();
  });
  (0, vitest_1.it)("returns undefined email when email is absent", async () => {
    const supabase = makeSupabase({ id: "user-789", app_metadata: {} });
    const result = await (0, guards_js_1.requireUser)(supabase);
    (0, vitest_1.expect)(result.email).toBeUndefined();
  });
  (0, vitest_1.it)("redirects to /login when unauthenticated (throws NEXT_REDIRECT)", async () => {
    const supabase = makeSupabase(null);
    await (0, vitest_1.expect)((0, guards_js_1.requireUser)(supabase)).rejects.toThrow(
      REDIRECT_ERROR,
    );
  });
});
// ─── requireAdmin ─────────────────────────────────────────────────────────────
(0, vitest_1.describe)("requireAdmin", () => {
  (0, vitest_1.it)("returns the user when authenticated and role is ADMIN", async () => {
    const supabase = makeSupabase({
      id: "admin-001",
      email: "admin@example.com",
      app_metadata: { user_role: "ADMIN" },
    });
    const result = await (0, guards_js_1.requireAdmin)(supabase);
    (0, vitest_1.expect)(result).toEqual({
      id: "admin-001",
      email: "admin@example.com",
      role: "ADMIN",
    });
  });
  (0, vitest_1.it)("returns 404 (not 403) when authenticated but role is USER", async () => {
    const supabase = makeSupabase({
      id: "user-002",
      email: "user@example.com",
      app_metadata: { user_role: "USER" },
    });
    // notFound() throws NEXT_HTTP_ERROR_FALLBACK;404 — distinct from redirect
    await (0, vitest_1.expect)((0, guards_js_1.requireAdmin)(supabase)).rejects.toThrow(
      NOT_FOUND_ERROR,
    );
  });
  (0, vitest_1.it)("returns 404 when role is missing entirely", async () => {
    const supabase = makeSupabase({ id: "user-003", email: "user@example.com" });
    await (0, vitest_1.expect)((0, guards_js_1.requireAdmin)(supabase)).rejects.toThrow(
      NOT_FOUND_ERROR,
    );
  });
  (0, vitest_1.it)("redirects to /login (not 404) when unauthenticated", async () => {
    const supabase = makeSupabase(null);
    // redirect() throws NEXT_REDIRECT — distinct from notFound()'s error
    await (0, vitest_1.expect)((0, guards_js_1.requireAdmin)(supabase)).rejects.toThrow(
      REDIRECT_ERROR,
    );
  });
});
//# sourceMappingURL=guards.test.js.map
