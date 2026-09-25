import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The route that hands a phone a usable avatar URL.
 *
 * Two properties are worth pinning, and they are the two that would be quiet
 * if they broke: it refuses an unauthenticated caller, and it never returns
 * the stored marker - returning it would put the app back where it started,
 * drawing initials for somebody who has a photo.
 */

// Typed rather than bare vi.fn(): an untyped mock hands back `any`, and `any`
// flowing out of a mock is how a test goes on passing after the shape it
// stands for has changed underneath it.
const userFromBearer =
  vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>();
const findUnique = vi.fn<(args: unknown) => Promise<{ avatarUrl: string | null } | null>>();
const resolveAvatarSrc = vi.fn<(v: string | null) => Promise<string | null>>();
const setAvatarPhotoFor =
  vi.fn<
    (
      u: string,
      file: unknown,
    ) => Promise<{ ok: true; marker: string } | { ok: false; error: string }>
  >();

vi.mock("../../_lib/auth", () => ({ userFromBearer: (r: Request) => userFromBearer(r) }));
vi.mock("@cyberlearn/db", () => ({
  prisma: { user: { findUnique: (a: unknown) => findUnique(a) } },
}));
vi.mock("@/lib/avatar/storage", () => ({
  resolveAvatarSrc: (v: string | null) => resolveAvatarSrc(v),
}));
vi.mock("@/lib/avatar/upload", () => ({
  setAvatarPhotoFor: (u: string, file: unknown) => setAvatarPhotoFor(u, file),
}));

const { GET, POST } = await import("../route");

function request(): NextRequest {
  return new NextRequest("https://cyberlearn.fr/api/mobile/avatar");
}

beforeEach(() => {
  userFromBearer.mockReset();
  findUnique.mockReset();
  resolveAvatarSrc.mockReset();
  setAvatarPhotoFor.mockReset();
});

describe("who may ask", () => {
  it("refuses a caller with no valid token", async () => {
    userFromBearer.mockResolvedValue(null);

    const res = await GET(request());

    expect(res.status).toBe(401);
    // And asks the database nothing at all.
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("only ever reads the caller's own row", async () => {
    // The reason this route takes no user id: one that did would be a way to
    // sign any object in the bucket.
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    findUnique.mockResolvedValue({ avatarUrl: null });
    resolveAvatarSrc.mockResolvedValue(null);

    await GET(request());

    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user-1" } }));
  });
});

describe("what comes back", () => {
  it("signs an upload marker rather than passing it on", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    findUnique.mockResolvedValue({ avatarUrl: "__upload:user-1/a.png" });
    resolveAvatarSrc.mockResolvedValue("https://x.supabase.co/sign/a?token=b");

    const res = await GET(request());
    const body = (await res.json()) as { ok: boolean; avatarUrl: string | null };

    expect(body.avatarUrl).toBe("https://x.supabase.co/sign/a?token=b");
    expect(body.avatarUrl).not.toContain("__upload:");
  });

  it("gives null when there is nothing to sign", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    findUnique.mockResolvedValue({ avatarUrl: null });
    resolveAvatarSrc.mockResolvedValue(null);

    const body = (await (await GET(request())).json()) as { avatarUrl: string | null };

    expect(body.avatarUrl).toBeNull();
  });

  it("gives null rather than an error when signing fails", async () => {
    // resolveAvatarSrc returns null on a signing failure, and null is what the
    // app draws initials for. A 500 here would be a broken profile screen.
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    findUnique.mockResolvedValue({ avatarUrl: "__upload:user-1/a.png" });
    resolveAvatarSrc.mockResolvedValue(null);

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(((await res.json()) as { avatarUrl: string | null }).avatarUrl).toBeNull();
  });

  it("answers 500 rather than leaking a stack when the read throws", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    findUnique.mockRejectedValue(new Error("connection refused at 10.0.0.4:5432"));

    const res = await GET(request());
    const body = (await res.json()) as { ok: boolean; error?: string };

    expect(res.status).toBe(500);
    expect(body.error).toBe("Avatar indisponible.");
    expect(JSON.stringify(body)).not.toContain("10.0.0.4");
  });
});

describe("sending a photo", () => {
  function upload(form: FormData | string, headers: Record<string, string> = {}): NextRequest {
    return new NextRequest("https://cyberlearn.fr/api/mobile/avatar", {
      method: "POST",
      body: form,
      headers,
    });
  }

  function photoForm(): FormData {
    const form = new FormData();
    form.set(
      "avatar",
      new File([new Uint8Array([0xff, 0xd8, 0xff])], "a.jpg", { type: "image/jpeg" }),
    );
    return form;
  }

  it("refuses a caller with no valid token, and stores nothing", async () => {
    userFromBearer.mockResolvedValue(null);
    expect((await POST(upload(photoForm()))).status).toBe(401);
    expect(setAvatarPhotoFor).not.toHaveBeenCalled();
  });

  it("refuses a declared body over the cap before reading it", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    const res = await POST(upload("x", { "content-length": String(3 * 1024 * 1024) }));
    expect(res.status).toBe(413);
    expect(((await res.json()) as { error: string }).error).toBe(
      "Image trop lourde (2 Mo maximum).",
    );
    expect(setAvatarPhotoFor).not.toHaveBeenCalled();
  });

  it("refuses a body that is not a form", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    const res = await POST(upload("nope", { "content-type": "text/plain" }));
    expect(res.status).toBe(400);
    expect(setAvatarPhotoFor).not.toHaveBeenCalled();
  });

  it("stores the caller's photo and answers with it signed, never the marker", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    setAvatarPhotoFor.mockResolvedValue({ ok: true, marker: "__upload:user-1/n.jpg" });
    resolveAvatarSrc.mockResolvedValue("https://x.supabase.co/sign/n?token=t");

    const res = await POST(upload(photoForm()));
    const body = (await res.json()) as { ok: boolean; avatarUrl: string | null };

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, avatarUrl: "https://x.supabase.co/sign/n?token=t" });
    expect(setAvatarPhotoFor.mock.calls[0]?.[0]).toBe("user-1");
    expect(setAvatarPhotoFor.mock.calls[0]?.[1]).toBeInstanceOf(File);
  });

  it("passes the service's refusal on", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    setAvatarPhotoFor.mockResolvedValue({ ok: false, error: "Fichier vide." });
    const res = await POST(upload(photoForm()));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Fichier vide." });
  });
});
