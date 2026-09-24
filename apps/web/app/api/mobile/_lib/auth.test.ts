import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  getUser:
    vi.fn<
      (token: string) => Promise<{
        data: { user: { id: string; email?: string; factors?: { status: string }[] } | null };
        error: unknown;
      }>
    >(),
  findActive: vi.fn<(userId: string) => Promise<{ id: string } | null>>(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getUser: m.getUser } }),
}));
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  },
}));
vi.mock("@cyberlearn/db", () => ({ banRepository: { findActive: m.findActive } }));

const { identityFromBearer, userFromBearer } = await import("./auth");

function jwt(payload: Record<string, unknown>): string {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
}

function request(token?: string): Request {
  return new Request("https://cyberlearn.fr/api/mobile/progress", {
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  });
}

const TOKEN = jwt({ aal: "aal1" });

beforeEach(() => {
  m.getUser.mockReset();
  m.findActive.mockReset();
});

describe("userFromBearer", () => {
  it("refuses a request with no token, without asking anybody", async () => {
    expect(await userFromBearer(request())).toBeNull();
    expect(m.getUser).not.toHaveBeenCalled();
  });

  it("refuses a token Supabase does not recognise", async () => {
    m.getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid JWT") });
    expect(await userFromBearer(request(TOKEN))).toBeNull();
    expect(m.findActive).not.toHaveBeenCalled();
  });

  it("refuses an AAL1 session on an account with a verified factor", async () => {
    m.getUser.mockResolvedValue({
      data: { user: { id: "user-1", factors: [{ status: "verified" }] } },
      error: null,
    });
    expect(await userFromBearer(request(TOKEN))).toBeNull();
  });

  it("lets an account with no ban in force act", async () => {
    m.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "a@example.org" } },
      error: null,
    });
    m.findActive.mockResolvedValue(null);
    expect(await userFromBearer(request(TOKEN))).toEqual({ id: "user-1", email: "a@example.org" });
    expect(m.findActive).toHaveBeenCalledWith("user-1");
  });

  it("refuses a banned account, as requireRequestUser does on the site", async () => {
    m.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    m.findActive.mockResolvedValue({ id: "ban-1" });
    expect(await userFromBearer(request(TOKEN))).toBeNull();
  });
});

describe("identityFromBearer", () => {
  it("still names a banned account, for the appeal and the notice", async () => {
    m.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    m.findActive.mockResolvedValue({ id: "ban-1" });
    expect(await identityFromBearer(request(TOKEN))).toEqual({ id: "user-1", email: null });
    expect(m.findActive).not.toHaveBeenCalled();
  });

  it("refuses what userFromBearer refuses for the token itself", async () => {
    expect(await identityFromBearer(request())).toBeNull();
    m.getUser.mockResolvedValue({ data: { user: null }, error: new Error("expired") });
    expect(await identityFromBearer(request(TOKEN))).toBeNull();
  });
});
