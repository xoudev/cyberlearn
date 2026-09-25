import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  updateProfileFor:
    vi.fn<(u: string, input: unknown) => Promise<{ success?: boolean; error?: string }>>(),
}));

vi.mock("../../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/profile/update-profile", () => ({ updateProfileFor: m.updateProfileFor }));

const { POST } = await import("../route");

const post = (body: string): NextRequest =>
  new NextRequest("https://cyberlearn.fr/api/mobile/settings/profile", { method: "POST", body });

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("POST /api/mobile/settings/profile", () => {
  it("refuses a caller the gate turns away", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await POST(post("{}"))).status).toBe(401);
    expect(m.updateProfileFor).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    expect((await POST(post("nope"))).status).toBe(400);
  });

  it("updates the caller's own profile with the three fields, nothing else", async () => {
    m.updateProfileFor.mockResolvedValue({ success: true });
    const res = await POST(
      post(
        JSON.stringify({
          displayName: "Alex",
          bio: "Réseaux.",
          avatarUrl: "/avatars/av-2.svg",
          username: "hijack",
          userId: "someone-else",
        }),
      ),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(m.updateProfileFor).toHaveBeenCalledWith("user-1", {
      displayName: "Alex",
      bio: "Réseaux.",
      avatarUrl: "/avatars/av-2.svg",
    });
  });

  it("passes missing fields as nothing, and relays a refusal with 409", async () => {
    m.updateProfileFor.mockResolvedValue({ error: "Profil invalide. Vérifiez les champs." });
    const res = await POST(post(JSON.stringify({})));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: "Profil invalide. Vérifiez les champs." });
    expect(m.updateProfileFor).toHaveBeenCalledWith("user-1", {
      displayName: null,
      bio: null,
      avatarUrl: null,
    });
  });
});
