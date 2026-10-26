import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BASTION_MARK_PATHS } from "../bastion-logo";

describe("Bastion output assets", () => {
  it("uses the site's actual paths in the raster source", () => {
    const svg = readFileSync(path.join(process.cwd(), "public/brand/bastion-mark.svg"), "utf8");
    for (const shape of Object.values(BASTION_MARK_PATHS)) expect(svg).toContain(`d="${shape}"`);
  });

  it.each([
    ["public/icon-192.png", 192],
    ["public/icon-512.png", 512],
    ["app/apple-icon.png", 180],
  ])("ships %s at its declared square size", (file, size) => {
    const bytes = readFileSync(path.join(process.cwd(), file));
    expect(Array.from(bytes.subarray(0, 4))).toEqual([137, 80, 78, 71]);
    expect(bytes.readUInt32BE(16)).toBe(size);
    expect(bytes.readUInt32BE(20)).toBe(size);
  });

  it("uses the full transparent, adaptive mark for both browser tab icons", () => {
    const web = readFileSync(path.join(process.cwd(), "app/icon.svg"), "utf8");
    const admin = readFileSync(path.join(process.cwd(), "../admin/app/icon.svg"), "utf8");
    expect(web).toBe(admin);
    for (const shape of Object.values(BASTION_MARK_PATHS)) expect(web).toContain(`d="${shape}"`);
    expect(web).toContain('viewBox="28 16 200 228"');
    expect(web).toContain("prefers-color-scheme:dark");
    expect(web).not.toContain("<rect");
    expect(readFileSync(path.join(process.cwd(), "app/favicon.ico"))).toEqual(
      readFileSync(path.join(process.cwd(), "../admin/app/favicon.ico")),
    );
  });

  it("serves the same high resolution mail wordmark in the site and console", () => {
    const web = readFileSync(path.join(process.cwd(), "public/brand/email-lockup.png"));
    const admin = readFileSync(path.join(process.cwd(), "../admin/public/brand/email-lockup.png"));
    expect(web).toEqual(admin);
    expect(web.readUInt32BE(16)).toBe(600);
    expect(web.readUInt32BE(20)).toBe(120);
  });
});
