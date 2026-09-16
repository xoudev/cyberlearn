import { redirect } from "next/navigation";

// These imports are provided by the Next.js app at runtime via transpilePackages.
// Keeping them here avoids duplicating auth logic across both apps.
// The actual Supabase client is created by the calling app (to avoid Next.js
// cookies() being called outside a request context).

export interface AuthUser {
  id: string;
  email: string | undefined;
}

/**
 * Asserts that a Supabase user is authenticated.
 * Redirects to /login if not authenticated.
 * To be called at the top of Server Actions and Server Components in protected routes.
 *
 * Identity only. The role is deliberately absent: it lives in public.users and
 * is read from there by the guards that need it - requireAdminAction() in the
 * admin app, userRepository.findRoleById() in the web app. It used to be read
 * here from the `user_role` access-token claim, which is stamped once when the
 * token is issued, so a role removed mid-session survived until the token
 * expired. 20260915130000_role_revocation_is_immediate moved the RLS side off
 * that claim for exactly that reason; this is the same move, for the
 * application side.
 *
 * @param supabase - A Supabase server client instance (created by the calling app)
 * @returns The authenticated Supabase user
 */
export async function requireUser(supabase: {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string } | null };
    }>;
  };
}): Promise<AuthUser> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return {
    id: user.id,
    email: user.email,
  };
}
