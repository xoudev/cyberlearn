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
    ["app/icon.png", 512],
    ["app/apple-icon.png", 180],
  ])("ships %s at its declared square size", (file, size) => {
    const bytes = readFileSync(path.join(process.cwd(), file));
    expect(Array.from(bytes.subarray(0, 4))).toEqual([137, 80, 78, 71]);
    expect(bytes.readUInt32BE(16)).toBe(size);
    expect(bytes.readUInt32BE(20)).toBe(size);
  });
});
