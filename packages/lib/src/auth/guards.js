"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUser = requireUser;
exports.requireAdmin = requireAdmin;
const navigation_1 = require("next/navigation");
/**
 * Asserts that a Supabase user is authenticated.
 * Redirects to /login if not authenticated.
 * To be called at the top of Server Actions and Server Components in protected routes.
 *
 * @param supabase - A Supabase server client instance (created by the calling app)
 * @returns The authenticated Supabase user
 */
async function requireUser(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    (0, navigation_1.redirect)("/login");
  }
  return {
    id: user.id,
    email: user.email,
    role: user.app_metadata?.user_role,
  };
}
/**
 * Asserts that the authenticated user has the ADMIN role.
 * Returns 404 (not 403) to avoid revealing that the route exists.
 * To be called at the top of every admin Server Action.
 *
 * @param supabase - A Supabase server client instance (created by the calling app)
 * @returns The authenticated admin user
 */
async function requireAdmin(supabase) {
  const user = await requireUser(supabase);
  if (user.role !== "ADMIN") {
    // 404 instead of 403 — do not reveal that this route exists to non-admins
    (0, navigation_1.notFound)();
  }
  return { ...user, role: "ADMIN" };
}
//# sourceMappingURL=guards.js.map
