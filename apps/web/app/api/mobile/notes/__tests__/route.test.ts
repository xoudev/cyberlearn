import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  shareAudienceFor: vi.fn<(u: string, noteId: unknown) => Promise<unknown>>(),
  shareNoteFor: vi.fn<(u: string, input: unknown) => Promise<unknown>>(),
  unshareNoteFor: vi.fn<(u: string, noteId: unknown, recipientId: unknown) => Promise<unknown>>(),
  sharedWithMeFor: vi.fn<(u: string) => Promise<unknown[]>>(),
  dismissSharedNoteFor: vi.fn<(u: string, noteId: unknown) => Promise<unknown>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/notes/note-share", () => ({
  shareAudienceFor: m.shareAudienceFor,
  shareNoteFor: m.shareNoteFor,
  unshareNoteFor: m.unshareNoteFor,
  sharedWithMeFor: m.sharedWithMeFor,
  dismissSharedNoteFor: m.dismissSharedNoteFor,
}));

const { GET: SHARED } = await import("../shared/route");
const { GET: AUDIENCE, POST: SHARE } = await import("../share/route");
const { POST: UNSHARE } = await import("../unshare/route");
const { POST: DISMISS } = await import("../dismiss/route");

const NOTE = "1c0b9a8d-7e6f-4b5a-8c3d-2e1f0a9b8c7d";
const PEER = "2d1c0b9a-8e7f-4c6b-9d4e-3f2a1b0c9d8e";

function get(url: string): NextRequest {
  return new NextRequest(`https://cyberlearn.fr/api/mobile/${url}`);
}
function post(url: string, body: string): NextRequest {
  return new NextRequest(`https://cyberlearn.fr/api/mobile/${url}`, { method: "POST", body });
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("every note-sharing route", () => {
  it.each([
    ["received", () => SHARED(get("notes/shared"))],
    ["audience", () => AUDIENCE(get(`notes/share?noteId=${NOTE}`))],
    ["share", () => SHARE(post("notes/share", "{}"))],
    ["unshare", () => UNSHARE(post("notes/unshare", "{}"))],
    ["dismiss", () => DISMISS(post("notes/dismiss", "{}"))],
  ])("refuses a caller the gate turns away (%s): no token, or banned", async (_n, call) => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
    expect(m.sharedWithMeFor).not.toHaveBeenCalled();
    expect(m.shareAudienceFor).not.toHaveBeenCalled();
    expect(m.shareNoteFor).not.toHaveBeenCalled();
    expect(m.unshareNoteFor).not.toHaveBeenCalled();
    expect(m.dismissSharedNoteFor).not.toHaveBeenCalled();
  });
});

describe("GET /api/mobile/notes/shared", () => {
  it("reads the caller's own received notes", async () => {
    m.sharedWithMeFor.mockResolvedValue([{ id: NOTE }]);
    const res = await SHARED(get("notes/shared"));
    expect(m.sharedWithMeFor).toHaveBeenCalledWith("user-1");
    expect(await res.json()).toEqual({ ok: true, notes: [{ id: NOTE }] });
  });
});

describe("GET /api/mobile/notes/share", () => {
  it("lists the caller's audience for the note, without avatar values", async () => {
    m.shareAudienceFor.mockResolvedValue({
      noAudience: false,
      entries: [
        {
          id: PEER,
          name: "Sam",
          avatarUrl: "__upload:sam.png",
          kind: "FRIEND",
          groupId: "friends",
          groupLabel: "Amis",
          holds: false,
        },
      ],
    });
    const res = await AUDIENCE(get(`notes/share?noteId=${NOTE}`));
    expect(m.shareAudienceFor).toHaveBeenCalledWith("user-1", NOTE);
    expect(await res.json()).toEqual({
      ok: true,
      noAudience: false,
      entries: [
        {
          id: PEER,
          name: "Sam",
          kind: "FRIEND",
          groupId: "friends",
          groupLabel: "Amis",
          holds: false,
        },
      ],
    });
  });
});

describe("POST /api/mobile/notes/share", () => {
  it("shares as the caller and answers 200", async () => {
    m.shareNoteFor.mockResolvedValue({ ok: true, shared: 1 });
    const body = { noteId: NOTE, recipientIds: [PEER] };
    const res = await SHARE(post("notes/share", JSON.stringify(body)));
    expect(res.status).toBe(200);
    expect(m.shareNoteFor).toHaveBeenCalledWith("user-1", body);
  });

  it("answers 409 with the service's refusal", async () => {
    m.shareNoteFor.mockResolvedValue({ ok: false, error: "Partage refusé : …" });
    const res = await SHARE(post("notes/share", JSON.stringify({ noteId: NOTE })));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: "Partage refusé : …" });
  });

  it("refuses a body that is not JSON", async () => {
    expect((await SHARE(post("notes/share", "nope"))).status).toBe(400);
    expect(m.shareNoteFor).not.toHaveBeenCalled();
  });
});

describe("POST /api/mobile/notes/unshare", () => {
  it("takes the note back as the caller", async () => {
    m.unshareNoteFor.mockResolvedValue({ ok: true });
    const res = await UNSHARE(
      post("notes/unshare", JSON.stringify({ noteId: NOTE, recipientId: PEER })),
    );
    expect(res.status).toBe(200);
    expect(m.unshareNoteFor).toHaveBeenCalledWith("user-1", NOTE, PEER);
  });

  it("hands missing fields to the service as nothing, and relays its refusal", async () => {
    m.unshareNoteFor.mockResolvedValue({ ok: false });
    const res = await UNSHARE(post("notes/unshare", JSON.stringify({})));
    expect(res.status).toBe(409);
    expect(m.unshareNoteFor).toHaveBeenCalledWith("user-1", null, null);
  });
});

describe("POST /api/mobile/notes/dismiss", () => {
  it("takes the received note out of the caller's own list", async () => {
    m.dismissSharedNoteFor.mockResolvedValue({ ok: true });
    const res = await DISMISS(post("notes/dismiss", JSON.stringify({ noteId: NOTE })));
    expect(res.status).toBe(200);
    expect(m.dismissSharedNoteFor).toHaveBeenCalledWith("user-1", NOTE);
  });

  it("relays a refusal, and a body that is not JSON never reaches the service", async () => {
    m.dismissSharedNoteFor.mockResolvedValue({ ok: false });
    expect((await DISMISS(post("notes/dismiss", JSON.stringify({})))).status).toBe(409);
    expect(m.dismissSharedNoteFor).toHaveBeenCalledWith("user-1", null);
    m.dismissSharedNoteFor.mockClear();
    expect((await DISMISS(post("notes/dismiss", "nope"))).status).toBe(400);
    expect(m.dismissSharedNoteFor).not.toHaveBeenCalled();
  });
});
