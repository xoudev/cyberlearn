import { describe, expect, it } from "vitest";
import { bytesPerRow, endsHalfRow, rowStarts, rowWidth } from "../dump-rows";

/**
 * A hex dump prints the longest row its box has room for: sixteen bytes, eight
 * or four. On a phone, sixteen and then eight still pushed the characters, the
 * column that gives a hidden string away, off the screen.
 */

/** HexEditor's offsets are eight hex digits, PacketDissector's four. */
const HEX_OFFSET = 64;
const PACKET_OFFSET = 36;

/**
 * The dump's box on a 375px phone: the lesson's 16px gutters, the lab's rule
 * and 16px padding, the dump's own rule.
 */
const PHONE_DUMP = 375 - 2 * 16 - 2 - 2 * 16 - 2;

describe("rowWidth", () => {
  it("adds up the padding, the offset, the cells and the characters of a row", () => {
    // 20 + 64 + 10 + (16 × 26 + 15 × 3 + 8) + 10 + 16 × 7.8
    expect(rowWidth(16, HEX_OFFSET)).toBeCloseTo(697.8);
    // 20 + 64 + 10 + (8 × 26 + 7 × 3) + 10 + 8 × 7.8
    expect(rowWidth(8, HEX_OFFSET)).toBeCloseTo(395.4);
    expect(rowWidth(4, HEX_OFFSET)).toBeCloseTo(248.2);
    expect(rowWidth(8, PACKET_OFFSET)).toBeCloseTo(367.4);
  });
});

describe("bytesPerRow", () => {
  it("keeps sixteen while the dump is unmeasured, and where they fit", () => {
    expect(bytesPerRow(null, HEX_OFFSET)).toBe(16);
    expect(bytesPerRow(rowWidth(16, HEX_OFFSET), HEX_OFFSET)).toBe(16);
    expect(bytesPerRow(1150, HEX_OFFSET)).toBe(16);
  });

  it("drops to eight where sixteen would scroll sideways", () => {
    expect(bytesPerRow(rowWidth(16, HEX_OFFSET) - 1, HEX_OFFSET)).toBe(8);
    expect(bytesPerRow(rowWidth(8, HEX_OFFSET), HEX_OFFSET)).toBe(8);
    expect(bytesPerRow(480, PACKET_OFFSET)).toBe(8);
  });

  it("drops to four where eight would, on a phone", () => {
    expect(bytesPerRow(rowWidth(8, HEX_OFFSET) - 1, HEX_OFFSET)).toBe(4);
    expect(bytesPerRow(rowWidth(8, PACKET_OFFSET) - 1, PACKET_OFFSET)).toBe(4);
    expect(bytesPerRow(PHONE_DUMP, HEX_OFFSET)).toBe(4);
    expect(bytesPerRow(PHONE_DUMP, PACKET_OFFSET)).toBe(4);
    expect(rowWidth(4, HEX_OFFSET)).toBeLessThanOrEqual(PHONE_DUMP);
  });

  it("gives a shorter offset its due: the same box takes more bytes behind it", () => {
    const between = (rowWidth(8, PACKET_OFFSET) + rowWidth(8, HEX_OFFSET)) / 2;
    expect(bytesPerRow(between, PACKET_OFFSET)).toBe(8);
    expect(bytesPerRow(between, HEX_OFFSET)).toBe(4);
  });

  it("prints four even in a box narrower than a row of four", () => {
    expect(bytesPerRow(120, HEX_OFFSET)).toBe(4);
  });
});

describe("rowStarts", () => {
  it("cuts the bytes into rows of the given length, the last one short", () => {
    expect(rowStarts(51, 16)).toEqual([0, 16, 32, 48]);
    expect(rowStarts(51, 8)).toEqual([0, 8, 16, 24, 32, 40, 48]);
    expect(rowStarts(10, 4)).toEqual([0, 4, 8]);
    expect(rowStarts(0, 16)).toEqual([]);
  });
});

describe("endsHalfRow", () => {
  it("leaves a gap after the eighth byte of a row of sixteen, none in a shorter row", () => {
    expect(endsHalfRow(7, 16)).toBe(true);
    expect(endsHalfRow(23, 16)).toBe(true);
    expect(endsHalfRow(15, 16)).toBe(false);
    expect(endsHalfRow(7, 8)).toBe(false);
    expect(endsHalfRow(7, 4)).toBe(false);
  });
});
