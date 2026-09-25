import { beforeEach, describe, expect, it, vi } from "vitest";
import { AVATAR_UPLOAD_ERROR, AVATAR_UPLOAD_MAX_BYTES } from "@cyberlearn/types";

const m = vi.hoisted(() => ({
  upload: vi.fn<(key: string, bytes: Uint8Array, opts: unknown) => Promise<{ error: unknown }>>(),
  remove: vi.fn<(keys: string[]) => Promise<unknown>>(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    storage: { from: () => ({ upload: m.upload, remove: m.remove }) },
  }),
}));

const { uploadUserAvatar } = await import("../storage");

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function file(bytes: number[], type: string, size?: number): File {
  const body = size === undefined ? new Uint8Array(bytes) : new Uint8Array(size);
  body.set(bytes.slice(0, body.length));
  return new File([body], "avatar", { type });
}

beforeEach(() => {
  m.upload.mockReset().mockResolvedValue({ error: null });
  m.remove.mockReset().mockResolvedValue({});
});

describe("uploadUserAvatar", () => {
  it("stores a real JPEG under the user's folder and removes the previous photo", async () => {
    const result = await uploadUserAvatar(
      "user-1",
      file(JPEG, "image/jpeg"),
      "__upload:user-1/a.png",
    );
    expect(result.marker).toMatch(/^__upload:user-1\/[0-9a-f-]{36}\.jpg$/);
    expect(m.upload.mock.calls[0]?.[2]).toEqual({ contentType: "image/jpeg", upsert: false });
    expect(m.remove).toHaveBeenCalledWith(["user-1/a.png"]);
  });

  it("refuses bytes that are not the declared type", async () => {
    expect(await uploadUserAvatar("user-1", file(PNG, "image/jpeg"), null)).toEqual({
      error: AVATAR_UPLOAD_ERROR.content,
    });
    expect(m.upload).not.toHaveBeenCalled();
  });

  it("refuses a format outside the allowlist, an empty file and one over 2 Mo", async () => {
    expect(await uploadUserAvatar("user-1", file(JPEG, "image/heic"), null)).toEqual({
      error: AVATAR_UPLOAD_ERROR.format,
    });
    expect(await uploadUserAvatar("user-1", file([], "image/jpeg"), null)).toEqual({
      error: AVATAR_UPLOAD_ERROR.empty,
    });
    expect(
      await uploadUserAvatar("user-1", file(JPEG, "image/jpeg", AVATAR_UPLOAD_MAX_BYTES + 1), null),
    ).toEqual({ error: AVATAR_UPLOAD_ERROR.tooLarge });
    expect(m.upload).not.toHaveBeenCalled();
  });

  it("says so when storage refuses, and removes nothing", async () => {
    m.upload.mockResolvedValue({ error: new Error("bucket") });
    expect(
      await uploadUserAvatar("user-1", file(JPEG, "image/jpeg"), "__upload:user-1/a.png"),
    ).toEqual({ error: AVATAR_UPLOAD_ERROR.storage });
    expect(m.remove).not.toHaveBeenCalled();
  });
});
