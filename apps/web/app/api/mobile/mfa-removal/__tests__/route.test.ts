import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  canDisableOwnMfa: vi.fn<(u: string) => Promise<boolean>>(),
  logger: { error: vi.fn() },
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/auth/mfa-removal", () => ({ canDisableOwnMfa: m.canDisableOwnMfa }));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: m.logger,
  errorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

const { GET } = await import("../route");

const URL = "https://cyberlearn.fr/api/mobile/mfa-removal";

beforeEach(() => {
  m.userFromBearer.mockReset();
  m.canDisableOwnMfa.mockReset();
  m.logger.error.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("GET /api/mobile/mfa-removal", () => {
  it("refuses a caller the gate turns away, without looking up a role", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await GET(new NextRequest(URL))).status).toBe(401);
    expect(m.canDisableOwnMfa).not.toHaveBeenCalled();
  });

  it("withholds the removal from an administrator", async () => {
    m.canDisableOwnMfa.mockResolvedValue(false);
    const res = await GET(new NextRequest(URL));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, canDisable: false });
    expect(m.canDisableOwnMfa).toHaveBeenCalledWith("user-1");
  });

  it("offers it to anybody else", async () => {
    m.canDisableOwnMfa.mockResolvedValue(true);
    expect(await (await GET(new NextRequest(URL))).json()).toEqual({ ok: true, canDisable: true });
  });

  it("answers a failed lookup with an error, never with a guess", async () => {
    m.canDisableOwnMfa.mockRejectedValue(new Error("connection reset"));
    const res = await GET(new NextRequest(URL));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ ok: false });
    expect(m.logger.error).toHaveBeenCalledWith(
      { scope: "mfa-removal", err: "connection reset" },
      "mfa removal policy failed",
    );
  });
});
