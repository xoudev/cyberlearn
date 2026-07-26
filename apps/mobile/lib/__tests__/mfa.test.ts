import { describe, expect, it } from "vitest";
import { readTotpQrSvg } from "../mfa";

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
