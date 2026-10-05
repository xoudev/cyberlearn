import { describe, expect, it } from "vitest";
import {
  asciiOf,
  editByte,
  FILE_KINDS,
  foldAnswer,
  hex2,
  identify,
  isFileAnswer,
  parseBytes,
  printableRuns,
  repairsMet,
} from "./hex";

/**
 * The signatures of the lessons' table, a broken PNG header repaired byte by
 * byte, the strings a dump lets you read, and an answer read as a learner
 * types it.
 */

const PNG =
  "89 50 4e 47 0d 0a 1a 0a 00 00 00 0d 49 48 44 52 00 00 00 01 00 00 00 01 08 02 00 00 00";
const bytes = (text: string): number[] => {
  const parsed = parseBytes(text);
  if (parsed === null) throw new Error(`not hex: ${text}`);
  return parsed;
};

describe("identify", () => {
  it("names the formats of the lesson's table by their first bytes", () => {
    expect(identify(bytes(PNG))?.name).toBe("image PNG");
    expect(identify(bytes("ff d8 ff e0 00 10"))?.name).toBe("image JPEG");
    expect(identify(bytes("25 50 44 46 2d 31 2e 37"))?.name).toBe("document PDF");
    expect(identify(bytes("50 4b 03 04 14 00"))?.name).toBe(
      "archive ZIP (aussi .docx, .xlsx, .jar, .apk)",
    );
    expect(identify(bytes("4d 5a 90 00"))?.name).toBe("programme Windows (.exe, .dll)");
    expect(identify(bytes("7f 45 4c 46 02 01"))?.name).toBe("programme Linux (ELF)");
    expect(identify(bytes("53 51 4c 69 74 65 20 66 6f 72 6d 61 74 20 33 00"))?.name).toBe(
      "base SQLite",
    );
    expect(identify(bytes("23 21 2f 62 69 6e"))?.name).toBe("script (shebang)");
  });

  it("knows nothing of a header that is broken, or too short", () => {
    expect(identify(bytes("00 50 4e 47 0d 0a 1a 0a"))).toBeNull();
    expect(identify(bytes("89 50 4e"))).toBeNull();
    expect(identify([])).toBeNull();
  });

  it("tries the long signatures first, so that none hides another", () => {
    for (let i = 1; i < FILE_KINDS.length; i++) {
      expect((FILE_KINDS[i - 1]?.magic.length ?? 0) >= (FILE_KINDS[i]?.magic.length ?? 0)).toBe(
        true,
      );
    }
  });
});

describe("repairing", () => {
  const broken = bytes(`00 00 ${PNG.slice(6)}`);
  const repairs = [{ offset: 0, bytes: "89 50" }];

  it("reads the header as repaired once the right bytes are written", () => {
    expect(repairsMet(broken, repairs)).toEqual([false]);
    const once = editByte(broken, 0, 0x89);
    expect(repairsMet(once, repairs)).toEqual([false]);
    const twice = editByte(once, 1, 0x50);
    expect(repairsMet(twice, repairs)).toEqual([true]);
    expect(identify(twice)?.name).toBe("image PNG");
    expect(broken[0]).toBe(0);
  });

  it("ignores an edit outside the file, and keeps a byte to eight bits", () => {
    expect(editByte([1, 2], 5, 9)).toEqual([1, 2]);
    expect(editByte([1, 2], 1, 0x1ff)).toEqual([1, 0xff]);
    expect(repairsMet([1, 2], [{ offset: 1, bytes: "zz" }])).toEqual([false]);
  });
});

describe("reading", () => {
  it("prints the strings a dump lets you read, four characters or more", () => {
    const text = bytes(
      "89 50 4e 47 0d 0a 1a 0a 00 00 00 0d 49 48 44 52 00 74 45 58 74 43 6f 6d 6d 65 6e 74 00 54 4f 55 52 4e 45 53 4f 4c 00",
    );
    expect(printableRuns(text)).toEqual([
      { offset: 12, text: "IHDR" },
      { offset: 17, text: "tEXtComment" },
      { offset: 29, text: "TOURNESOL" },
    ]);
    expect(printableRuns(text, 10)).toEqual([{ offset: 17, text: "tEXtComment" }]);
  });

  it("shows a byte as a character or a dot, and as two hexadecimal digits", () => {
    expect(asciiOf(0x41)).toBe("A");
    expect(asciiOf(0x0a)).toBe(".");
    expect(asciiOf(0x7f)).toBe(".");
    expect(hex2(9)).toBe("09");
    expect(hex2(255)).toBe("ff");
  });

  it("refuses text that is not hexadecimal", () => {
    expect(parseBytes("89 5")).toBeNull();
    expect(parseBytes("8g")).toBeNull();
    expect(parseBytes("89 50\n4E47")).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});

describe("isFileAnswer", () => {
  it("reads an answer case, accents and spacing aside, among those accepted", () => {
    expect(isFileAnswer(["PNG", "image PNG"], " png ")).toBe(true);
    expect(isFileAnswer(["programme Windows"], "Programme  windows")).toBe(true);
    expect(isFileAnswer("Un exécutable", "un executable")).toBe(true);
    expect(isFileAnswer("TOURNESOL", "tournesol")).toBe(true);
    expect(isFileAnswer("TOURNESOL", "")).toBe(false);
    expect(isFileAnswer("PDF", "PNG")).toBe(false);
    expect(foldAnswer("  Élève   ÇA ")).toBe("eleve ca");
  });
});
