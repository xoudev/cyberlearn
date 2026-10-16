import { describe, expect, it, vi } from "vitest";
import {
  leaveMfaChallenge,
  loadTotpPanel,
  readMfaRemovalAnswer,
  readTotpQrSvg,
  SIGN_OUT_FAILED,
} from "../mfa";

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

const ONE_FACTOR = {
  data: { totp: [{ id: "f-1", friendly_name: "CyberLearn Mobile" }] },
  error: null,
};

describe("loadTotpPanel", () => {
  it("offers the removal once the server says this account may", async () => {
    const fetchCanDisable = vi.fn(() => Promise.resolve(true));
    await expect(
      loadTotpPanel({ listFactors: () => Promise.resolve(ONE_FACTOR), fetchCanDisable }),
    ).resolves.toEqual({
      factors: { status: "ready", factors: [{ id: "f-1", friendlyName: "CyberLearn Mobile" }] },
      canDisable: true,
    });
  });

  it("withholds it from an administrator, factor still shown", async () => {
    const state = await loadTotpPanel({
      listFactors: () => Promise.resolve(ONE_FACTOR),
      fetchCanDisable: () => Promise.resolve(false),
    });
    expect(state.canDisable).toBe(false);
    expect(state.factors).toMatchObject({ status: "ready", factors: [{ id: "f-1" }] });
  });

  it("does not ask the server when there is no factor to remove", async () => {
    const fetchCanDisable = vi.fn(() => Promise.resolve(true));
    const state = await loadTotpPanel({
      listFactors: () => Promise.resolve({ data: { totp: [] }, error: null }),
      fetchCanDisable,
    });
    expect(state).toEqual({ factors: { status: "ready", factors: [] }, canDisable: false });
    expect(fetchCanDisable).not.toHaveBeenCalled();
  });

  it("says unknown, and offers nothing, when the server does not answer for a factor", async () => {
    await expect(
      loadTotpPanel({
        listFactors: () => Promise.resolve(ONE_FACTOR),
        fetchCanDisable: () => Promise.reject(new Error("offline")),
      }),
    ).resolves.toEqual({ factors: { status: "error" }, canDisable: false });
  });

  it("says unknown when the factors cannot be read", async () => {
    const fetchCanDisable = vi.fn(() => Promise.resolve(true));
    await expect(
      loadTotpPanel({ listFactors: () => Promise.reject(new Error("offline")), fetchCanDisable }),
    ).resolves.toEqual({ factors: { status: "error" }, canDisable: false });
    expect(fetchCanDisable).not.toHaveBeenCalled();
  });
});

describe("readMfaRemovalAnswer", () => {
  it("reads the server's flag", () => {
    expect(readMfaRemovalAnswer({ ok: true, canDisable: true })).toBe(true);
    expect(readMfaRemovalAnswer({ ok: true, canDisable: false })).toBe(false);
  });

  it("reads anything else as no answer", () => {
    expect(readMfaRemovalAnswer({ ok: false, error: "Non authentifié." })).toBeNull();
    expect(readMfaRemovalAnswer({ ok: true })).toBeNull();
    expect(readMfaRemovalAnswer({ ok: true, canDisable: "yes" })).toBeNull();
    expect(readMfaRemovalAnswer(null)).toBeNull();
    expect(readMfaRemovalAnswer("<html>")).toBeNull();
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
