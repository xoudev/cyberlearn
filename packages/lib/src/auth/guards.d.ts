export interface AuthUser {
  id: string;
  email: string | undefined;
  role: string | undefined;
}
/**
 * Asserts that a Supabase user is authenticated.
 * Redirects to /login if not authenticated.
 * To be called at the top of Server Actions and Server Components in protected routes.
 *
 * @param supabase - A Supabase server client instance (created by the calling app)
 * @returns The authenticated Supabase user
 */
export declare function requireUser(supabase: {
  auth: {
    getUser: () => Promise<{
      data: {
        user: {
          id: string;
          email?: string;
          app_metadata?: Record<string, unknown>;
        } | null;
      };
    }>;
  };
}): Promise<{
  id: string;
  email: string | undefined;
  role: string | undefined;
}>;
/**
 * Asserts that the authenticated user has the ADMIN role.
 * Returns 404 (not 403) to avoid revealing that the route exists.
 * To be called at the top of every admin Server Action.
 *
 * @param supabase - A Supabase server client instance (created by the calling app)
 * @returns The authenticated admin user
 */
export declare function requireAdmin(supabase: {
  auth: {
    getUser: () => Promise<{
      data: {
        user: {
          id: string;
          email?: string;
          app_metadata?: Record<string, unknown>;
        } | null;
      };
    }>;
  };
}): Promise<{
  id: string;
  email: string | undefined;
  role: string;
}>;
//# sourceMappingURL=guards.d.ts.map
