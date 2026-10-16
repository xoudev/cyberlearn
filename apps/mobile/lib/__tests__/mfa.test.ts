import { describe, expect, it, vi } from "vitest";
import { leaveMfaChallenge, readTotpQrSvg, SIGN_OUT_FAILED } from "../mfa";

describe("readTotpQrSvg", () => {
  it("extracts the raw SVG returned by Supabase Auth", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path /></svg>';
    expect(readTotpQrSvg(`data:image/svg+xml;utf-8,${svg}`)).toBe(svg);
  });

  it("decodes an encoded SVG data URI", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path /></svg>';
    expect(readTotpQrSvg(`data:image/svg+xml;utf-8,${encodeURIComponent(svg)}`)).toBe(svg);
  });

  it("keeps raw SVG input compatible with older Auth clients", () => {
    expect(readTotpQrSvg("<svg><path /></svg>")).toBe("<svg><path /></svg>");
  });

  it("rejects non-SVG content", () => {
    expect(readTotpQrSvg("https://example.com/qr.svg")).toBeNull();
    expect(readTotpQrSvg("data:image/svg+xml;utf-8,not-svg")).toBeNull();
  });
});

describe("leaveMfaChallenge", () => {
  it("has nothing to say once the session is gone", async () => {
    const signOut = vi.fn(() => Promise.resolve({ error: null }));
    await expect(leaveMfaChallenge({ signOut })).resolves.toBeNull();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("says so when the sign-out failed, and the session with it stayed", async () => {
    const signOut = vi.fn(() => Promise.resolve({ error: new Error("Failed to fetch") }));
    await expect(leaveMfaChallenge({ signOut })).resolves.toBe(SIGN_OUT_FAILED);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("says so when the sign-out throws", async () => {
    await expect(
      leaveMfaChallenge({ signOut: () => Promise.reject(new Error("boom")) }),
    ).resolves.toBe(SIGN_OUT_FAILED);
  });
});
