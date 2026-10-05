import { describe, expect, it } from "vitest";
import { hexByteCount, parseHexEditor } from "../hex-editor.schema";

const PNG = "00 50 4e 47 0d 0a 1a 0a 00 00 00 0d 49 48 44 52";

describe("parseHexEditor", () => {
  it("accepts a file with repairs and questions, editable unless said otherwise", () => {
    const parsed = parseHexEditor({
      id: "h",
      task: "Répare l'en-tête.",
      bytes: PNG,
      repairs: [{ label: "La signature PNG", offset: 0, bytes: "89" }],
      questions: [{ label: "Quel type ?", answer: ["PNG", "image PNG"] }],
    });
    if (!parsed.ok) throw new Error(parsed.problem);
    expect(parsed.value.editable).toBe(true);
    expect(parsed.value.repairs).toHaveLength(1);
    expect(hexByteCount(parsed.value.bytes)).toBe(16);
  });

  it("refuses bytes that are not hexadecimal, and says so", () => {
    expect(parseHexEditor({ id: "h", task: "x", bytes: "89 5" })).toMatchObject({
      ok: false,
      problem: expect.stringContaining("bytes : des octets en hexadécimal") as string,
    });
    expect(parseHexEditor({ id: "h", task: "x", bytes: "zz" }).ok).toBe(false);
  });

  it("refuses a repair past the end of the file, and names it", () => {
    expect(
      parseHexEditor({
        id: "h",
        task: "x",
        bytes: PNG,
        repairs: [{ label: "Trop loin", offset: 15, bytes: "89 50" }],
      }),
    ).toEqual({
      ok: false,
      problem: "la réparation « Trop loin » dépasse la fin du fichier (16 octets).",
    });
  });

  it("refuses repairs on a file that cannot be edited, and a file too big", () => {
    expect(
      parseHexEditor({
        id: "h",
        task: "x",
        bytes: PNG,
        editable: false,
        repairs: [{ label: "r", offset: 0, bytes: "89" }],
      }),
    ).toMatchObject({ ok: false, problem: expect.stringContaining("modifiables") as string });
    expect(parseHexEditor({ id: "h", task: "x", bytes: "00 ".repeat(2049) })).toMatchObject({
      ok: false,
      problem: expect.stringContaining("2049 octets") as string,
    });
  });
});
