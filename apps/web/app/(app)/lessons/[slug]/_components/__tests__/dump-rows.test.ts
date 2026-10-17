import { describe, expect, it } from "vitest";
import { bytesPerRow, endsHalfRow, rowStarts, SIXTEEN_BYTES_MIN_WIDTH } from "../dump-rows";

/**
 * A hex dump prints sixteen bytes a row where they fit and eight where they do
 * not: on a phone, sixteen pushed the characters, the column that gives a
 * hidden string away, off the screen.
 */

describe("bytesPerRow", () => {
  it("keeps sixteen while the dump is unmeasured, and where they fit", () => {
    expect(bytesPerRow(null)).toBe(16);
    expect(bytesPerRow(SIXTEEN_BYTES_MIN_WIDTH)).toBe(16);
    expect(bytesPerRow(1150)).toBe(16);
  });

  it("drops to eight where sixteen would scroll sideways", () => {
    expect(bytesPerRow(SIXTEEN_BYTES_MIN_WIDTH - 1)).toBe(8);
    expect(bytesPerRow(343)).toBe(8);
  });
});

describe("rowStarts", () => {
  it("cuts the bytes into rows of the given length, the last one short", () => {
    expect(rowStarts(51, 16)).toEqual([0, 16, 32, 48]);
    expect(rowStarts(51, 8)).toEqual([0, 8, 16, 24, 32, 40, 48]);
    expect(rowStarts(0, 16)).toEqual([]);
  });
});

describe("endsHalfRow", () => {
  it("leaves a gap after the eighth byte of a row of sixteen, none in a row of eight", () => {
    expect(endsHalfRow(7, 16)).toBe(true);
    expect(endsHalfRow(23, 16)).toBe(true);
    expect(endsHalfRow(15, 16)).toBe(false);
    expect(endsHalfRow(7, 8)).toBe(false);
  });
});
