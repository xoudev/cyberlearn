import { beforeEach, describe, expect, it, vi } from "vitest";
import { AVATAR_UPLOAD_ERROR } from "@cyberlearn/types";

const m = vi.hoisted(() => ({
  findUnique: vi.fn<(args: unknown) => Promise<{ avatarUrl: string | null } | null>>(),
  update: vi.fn<(args: unknown) => Promise<unknown>>(),
  uploadUserAvatar:
    vi.fn<
      (u: string, f: File, previous: string | null) => Promise<{ marker?: string; error?: string }>
    >(),
}));

vi.mock("@cyberlearn/db", () => ({
  prisma: { user: { findUnique: m.findUnique, update: m.update } },
}));
vi.mock("../storage", () => ({ uploadUserAvatar: m.uploadUserAvatar }));

const { setAvatarPhotoFor } = await import("../upload");

const PHOTO = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "avatar.jpg", {
  type: "image/jpeg",
});

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.findUnique.mockResolvedValue({ avatarUrl: "__upload:user-1/old.png" });
  m.update.mockResolvedValue({});
});

describe("setAvatarPhotoFor", () => {
  it("stores the photo, replacing the previous one, and points the account at it", async () => {
    m.uploadUserAvatar.mockResolvedValue({ marker: "__upload:user-1/new.jpg" });

    expect(await setAvatarPhotoFor("user-1", PHOTO)).toEqual({
      ok: true,
      marker: "__upload:user-1/new.jpg",
    });
    expect(m.uploadUserAvatar).toHaveBeenCalledWith("user-1", PHOTO, "__upload:user-1/old.png");
    expect(m.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { avatarUrl: "__upload:user-1/new.jpg" },
    });
  });

  it("refuses anything that is not a file, before touching storage", async () => {
    for (const value of [null, "avatar.jpg", { uri: "file:///x.jpg" }]) {
      expect(await setAvatarPhotoFor("user-1", value)).toEqual({
        ok: false,
        error: AVATAR_UPLOAD_ERROR.missing,
      });
    }
    expect(m.uploadUserAvatar).not.toHaveBeenCalled();
    expect(m.update).not.toHaveBeenCalled();
  });

  it("passes the storage's refusal on and leaves the account alone", async () => {
    m.uploadUserAvatar.mockResolvedValue({ error: AVATAR_UPLOAD_ERROR.tooLarge });
    expect(await setAvatarPhotoFor("user-1", PHOTO)).toEqual({
      ok: false,
      error: AVATAR_UPLOAD_ERROR.tooLarge,
    });
    expect(m.update).not.toHaveBeenCalled();
  });
});
