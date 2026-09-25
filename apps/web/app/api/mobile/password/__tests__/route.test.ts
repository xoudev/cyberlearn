import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  bearerHasRecoveryGrant: vi.fn<(r: Request) => boolean>(),
  verifyCurrentPassword: vi.fn<(email: string, password: string) => Promise<boolean>>(),
  checkPasswordChange:
    vi.fn<(u: string) => Promise<{ success: boolean; retryAfterSeconds: number }>>(),
  updateUserById: vi.fn<(id: string, attrs: unknown) => Promise<{ error: unknown }>>(),
}));

vi.mock("../../_lib/auth", () => ({
  userFromBearer: m.userFromBearer,
  bearerHasRecoveryGrant: m.bearerHasRecoveryGrant,
}));
vi.mock("@/lib/auth/verify-password", () => ({ verifyCurrentPassword: m.verifyCurrentPassword }));
vi.mock("@/lib/rate-limit", () => ({ checkPasswordChange: m.checkPasswordChange }));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ auth: { admin: { updateUserById: m.updateUserById } } }),
}));

const { POST } = await import("../route");

// Fixture passwords carry "placeholder", which the secrets scan knows is not a credential.
const NEW = { password: "placeholder-new-2026", passwordConfirmation: "placeholder-new-2026" };
const CURRENT = "placeholder-current-2025";

function post(body: unknown): NextRequest {
  return new NextRequest("https://cyberlearn.fr/api/mobile/password", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: "alex@example.fr" });
  m.checkPasswordChange.mockResolvedValue({ success: true, retryAfterSeconds: 0 });
  m.updateUserById.mockResolvedValue({ error: null });
  m.bearerHasRecoveryGrant.mockReturnValue(false);
});

describe("POST /api/mobile/password", () => {
  it("refuses a caller the gate turns away", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await POST(post(NEW))).status).toBe(401);
    expect(m.updateUserById).not.toHaveBeenCalled();
  });

  it("changes the password when the current one is right", async () => {
    m.verifyCurrentPassword.mockResolvedValue(true);
    const res = await POST(post({ ...NEW, currentPassword: CURRENT }));
    expect(res.status).toBe(200);
    expect(m.verifyCurrentPassword).toHaveBeenCalledWith("alex@example.fr", CURRENT);
    expect(m.updateUserById).toHaveBeenCalledWith("user-1", { password: NEW.password });
  });

  it("refuses a wrong current password, even in a recovery session", async () => {
    m.verifyCurrentPassword.mockResolvedValue(false);
    m.bearerHasRecoveryGrant.mockReturnValue(true);
    const res = await POST(post({ ...NEW, currentPassword: "placeholder-wrong" }));
    expect(res.status).toBe(400);
    expect(m.updateUserById).not.toHaveBeenCalled();
  });

  it("skips the current password only in a session opened by the recovery code", async () => {
    m.bearerHasRecoveryGrant.mockReturnValue(true);
    const res = await POST(post(NEW));
    expect(res.status).toBe(200);
    expect(m.verifyCurrentPassword).not.toHaveBeenCalled();
    expect(m.updateUserById).toHaveBeenCalledWith("user-1", { password: NEW.password });
  });

  it("asks for the current password in any other session: a stolen one is not enough", async () => {
    const res = await POST(post(NEW));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: "Saisis ton mot de passe actuel pour confirmer le changement.",
      needsCurrentPassword: true,
    });
    expect(m.updateUserById).not.toHaveBeenCalled();
  });

  it("refuses a password the rules refuse, and applies the rate limit first", async () => {
    m.bearerHasRecoveryGrant.mockReturnValue(true);
    expect((await POST(post({ password: "court", passwordConfirmation: "court" }))).status).toBe(
      400,
    );
    m.checkPasswordChange.mockResolvedValue({ success: false, retryAfterSeconds: 60 });
    expect((await POST(post(NEW))).status).toBe(429);
    expect(m.updateUserById).not.toHaveBeenCalled();
  });
});
