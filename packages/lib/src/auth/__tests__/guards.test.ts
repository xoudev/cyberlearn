import { describe, expect, it, vi } from "vitest";
import { requireUser, requireAdmin } from "../guards.js";

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

// Next.js 15 throws these special error messages from redirect() / notFound().
// We match against them to verify the correct branch was taken.
const REDIRECT_ERROR = "NEXT_REDIRECT";
const NOT_FOUND_ERROR = "NEXT_HTTP_ERROR_FALLBACK;404";

// ─── requireUser ─────────────────────────────────────────────────────────────

describe("requireUser", () => {
  it("returns the user when authenticated", async () => {
    const supabase = makeSupabase({
      id: "user-123",
      email: "test@example.com",
      app_metadata: { user_role: "USER" },
    });

    const result = await requireUser(supabase);

    expect(result).toEqual({
      id: "user-123",
      email: "test@example.com",
      role: "USER",
    });
  });

  it("extracts role from app_metadata.user_role", async () => {
    const supabase = makeSupabase({
      id: "admin-456",
      email: "admin@example.com",
      app_metadata: { user_role: "ADMIN" },
    });

    const result = await requireUser(supabase);
    expect(result.role).toBe("ADMIN");
  });

  it("returns undefined role when app_metadata is absent", async () => {
    const supabase = makeSupabase({ id: "user-789", email: "noRole@example.com" });

    const result = await requireUser(supabase);
    expect(result.role).toBeUndefined();
  });

  it("returns undefined email when email is absent", async () => {
    const supabase = makeSupabase({ id: "user-789", app_metadata: {} });

    const result = await requireUser(supabase);
    expect(result.email).toBeUndefined();
  });

  it("redirects to /login when unauthenticated (throws NEXT_REDIRECT)", async () => {
    const supabase = makeSupabase(null);

    await expect(requireUser(supabase)).rejects.toThrow(REDIRECT_ERROR);
  });
});

// ─── requireAdmin ─────────────────────────────────────────────────────────────

describe("requireAdmin", () => {
  it("returns the user when authenticated and role is ADMIN", async () => {
    const supabase = makeSupabase({
      id: "admin-001",
      email: "admin@example.com",
      app_metadata: { user_role: "ADMIN" },
    });

    const result = await requireAdmin(supabase);

    expect(result).toEqual({
      id: "admin-001",
      email: "admin@example.com",
      role: "ADMIN",
    });
  });

  it("returns 404 (not 403) when authenticated but role is USER", async () => {
    const supabase = makeSupabase({
      id: "user-002",
      email: "user@example.com",
      app_metadata: { user_role: "USER" },
    });

    // notFound() throws NEXT_HTTP_ERROR_FALLBACK;404 - distinct from redirect
    await expect(requireAdmin(supabase)).rejects.toThrow(NOT_FOUND_ERROR);
  });

  it("returns 404 when role is missing entirely", async () => {
    const supabase = makeSupabase({ id: "user-003", email: "user@example.com" });

    await expect(requireAdmin(supabase)).rejects.toThrow(NOT_FOUND_ERROR);
  });

  it("redirects to /login (not 404) when unauthenticated", async () => {
    const supabase = makeSupabase(null);

    // redirect() throws NEXT_REDIRECT - distinct from notFound()'s error
    await expect(requireAdmin(supabase)).rejects.toThrow(REDIRECT_ERROR);
  });
});
