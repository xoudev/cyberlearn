import { redirect, notFound } from "next/navigation";

// These imports are provided by the Next.js app at runtime via transpilePackages.
// Keeping them here avoids duplicating auth logic across both apps.
// The actual Supabase client is created by the calling app (to avoid Next.js
// cookies() being called outside a request context).

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
export async function requireUser(supabase: {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string; app_metadata?: Record<string, unknown> } | null };
    }>;
  };
}): Promise<{ id: string; email: string | undefined; role: string | undefined }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return {
    id: user.id,
    email: user.email,
    role: user.app_metadata?.["user_role"] as string | undefined,
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
export async function requireAdmin(supabase: {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string; app_metadata?: Record<string, unknown> } | null };
    }>;
  };
}): Promise<{ id: string; email: string | undefined; role: string }> {
  const user = await requireUser(supabase);

  if (user.role !== "ADMIN") {
    // 404 instead of 403 — do not reveal that this route exists to non-admins
    notFound();
  }

  return { ...user, role: "ADMIN" };
}
