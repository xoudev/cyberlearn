import { describe, expect, it, vi } from "vitest";
import { requireUser } from "../guards.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSupabase(
  user: {
    id: string;
    email?: string;
    app_metadata?: Record<string, unknown>;
  } | null,
) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  };
}

// Next.js 15 throws this special error message from redirect().
// We match against it to verify the correct branch was taken.
const REDIRECT_ERROR = "NEXT_REDIRECT";

// ─── requireUser ─────────────────────────────────────────────────────────────

describe("requireUser", () => {
  it("returns the user when authenticated", async () => {
    const supabase = makeSupabase({ id: "user-123", email: "test@example.com" });

    const result = await requireUser(supabase);

    expect(result).toEqual({
      id: "user-123",
      email: "test@example.com",
    });
  });

  it("returns undefined email when email is absent", async () => {
    const supabase = makeSupabase({ id: "user-789" });

    const result = await requireUser(supabase);
    expect(result.email).toBeUndefined();
  });

  it("does not carry a role, whatever the token claims", async () => {
    // The guard used to read app_metadata.user_role. A caller that still found
    // a role here would be trusting a value stamped when the token was issued,
    // which is what immediate revocation exists to stop; the role belongs to
    // public.users and is read from there.
    const supabase = makeSupabase({
      id: "admin-456",
      email: "admin@example.com",
      app_metadata: { user_role: "ADMIN" },
    });

    const result = await requireUser(supabase);

    expect(result).not.toHaveProperty("role");
  });

  it("redirects to /login when unauthenticated (throws NEXT_REDIRECT)", async () => {
    const supabase = makeSupabase(null);

    await expect(requireUser(supabase)).rejects.toThrow(REDIRECT_ERROR);
  });
});
