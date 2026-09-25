import { describe, expect, it } from "vitest";
import { AVATAR_EXPORT_PX, AVATAR_UPLOAD_ERROR, AVATAR_UPLOAD_MAX_BYTES } from "@cyberlearn/types";
import {
  AVATAR_PHOTO_HINT,
  avatarPhotoTransform,
  photoMimeOf,
  photoUploadPart,
} from "../avatar-photo";

describe("a photo picked on the phone", () => {
  it("takes the picker's type when the server accepts it", () => {
    expect(photoMimeOf({ uri: "file:///a", mimeType: "image/png" })).toBe("image/png");
    expect(photoMimeOf({ uri: "file:///a", mimeType: "IMAGE/JPEG" })).toBe("image/jpeg");
  });

  it("falls back on the file's extension when the picker says nothing usable", () => {
    expect(photoMimeOf({ uri: "file:///cache/ImagePicker/x.jpeg" })).toBe("image/jpeg");
    expect(photoMimeOf({ uri: "content://x", fileName: "IMG_1.WEBP" })).toBe("image/webp");
    expect(photoMimeOf({ uri: "file:///x.png?v=2", mimeType: null })).toBe("image/png");
  });

  it("knows nothing of a format the server refuses", () => {
    expect(photoMimeOf({ uri: "file:///x.heic", mimeType: "image/heic" })).toBeNull();
    expect(photoMimeOf({ uri: "file:///x.gif" })).toBeNull();
    expect(photoMimeOf({ uri: "file:///noextension" })).toBeNull();
  });

  it("names the part after its type, for the server to check against the bytes", () => {
    expect(
      photoUploadPart({ uri: "file:///x.jpg", mimeType: "image/jpeg", fileSize: 900_000 }),
    ).toEqual({
      ok: true,
      part: { uri: "file:///x.jpg", name: "avatar.jpg", type: "image/jpeg" },
    });
  });

  it("refuses what the server would refuse, in the server's words", () => {
    expect(photoUploadPart({ uri: "file:///x.heic" })).toEqual({
      ok: false,
      error: AVATAR_UPLOAD_ERROR.format,
    });
    expect(
      photoUploadPart({ uri: "file:///x.png", fileSize: AVATAR_UPLOAD_MAX_BYTES + 1 }),
    ).toEqual({ ok: false, error: AVATAR_UPLOAD_ERROR.tooLarge });
    expect(photoUploadPart({ uri: "file:///x.png", fileSize: 0 })).toEqual({
      ok: false,
      error: AVATAR_UPLOAD_ERROR.empty,
    });
  });

  it("lets the server judge a size the picker did not report", () => {
    expect(photoUploadPart({ uri: "file:///x.png" }).ok).toBe(true);
  });
});

describe("bringing a photo to the site's square", () => {
  it("reduces a square photo to 512 px, without cutting it", () => {
    expect(avatarPhotoTransform(3024, 3024)).toEqual({ crop: null, size: 512 });
  });

  it("cuts the centred square out of a photo the gallery did not crop", () => {
    expect(avatarPhotoTransform(4032, 3024)).toEqual({
      crop: { originX: 504, originY: 0, width: 3024, height: 3024 },
      size: 512,
    });
    expect(avatarPhotoTransform(1080, 1921)).toEqual({
      crop: { originX: 0, originY: 420, width: 1080, height: 1080 },
      size: 512,
    });
  });

  it("never enlarges a small photo", () => {
    expect(avatarPhotoTransform(300, 300)).toEqual({ crop: null, size: 300 });
  });

  it("falls back to the site's size when the picker reports no dimensions", () => {
    expect(avatarPhotoTransform(0, 0)).toEqual({ crop: null, size: AVATAR_EXPORT_PX });
  });

  it("says what happens to the photo", () => {
    expect(AVATAR_PHOTO_HINT).toBe("Recadrée au carré et réduite à 512 × 512 pixels.");
  });
});
