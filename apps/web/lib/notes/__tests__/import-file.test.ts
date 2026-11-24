import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { NOTE_CONTENT_MAX, NOTE_IMPORT_LIMITS } from "@cyberlearn/lib/notes/workspace";
import { ALL_NOTES_ROOT, buildNotesZip } from "../archive";
import {
  cleanImportedText,
  importBatches,
  ImportError,
  noteFromText,
  readImportFile,
  splitFrontMatter,
} from "../import-file";

/**
 * The import, read in the browser: what a hostile or broken file can do is
 * bounded here, and whatever comes out is text the server checks again.
 */

const file = (name: string, data: Uint8Array | string): File =>
  new File([typeof data === "string" ? data : (data as BlobPart)], name); // fflate's bytes are a plain ArrayBuffer at runtime

describe("front matter", () => {
  it("reads the title only, and never runs anything", () => {
    const text = '---js\n{ title: require("fs") }\n---\nbody';
    expect(splitFrontMatter(text)).toEqual({ title: null, body: text });
    expect(splitFrontMatter('---\ntitle: "Le \\"vrai\\""\ntags: [a]\n---\n\nCorps')).toEqual({
      title: 'Le "vrai"',
      body: "Corps",
    });
  });

  it("titles a note from its header, else its first heading, else its file", () => {
    expect(noteFromText("a.md", "---\ntitle: Haut\n---\n# Bas", []).title).toBe("Haut");
    expect(noteFromText("a.md", "texte\n# Bas", []).title).toBe("Bas");
    expect(noteFromText("dir/Mon fichier.md", "texte", []).title).toBe("Mon fichier");
  });

  it("drops a BOM and control characters, keeps tabs and newlines", () => {
    expect(cleanImportedText("﻿a\r\nb\u0000\tc\u0007")).toBe("a\nb\tc");
  });
});

describe("readImportFile", () => {
  it("reads one .md", async () => {
    const res = await readImportFile(file("Ports.md", "# Les ports\n22 :: ssh"));
    expect(res.notes).toEqual([
      { folders: [], title: "Les ports", content: "# Les ports\n22 :: ssh" },
    ]);
  });

  it("refuses what is not UTF-8 text", async () => {
    await expect(
      readImportFile(file("x.md", new Uint8Array([0xff, 0xfe, 0x00]))),
    ).rejects.toBeInstanceOf(ImportError);
  });

  it("refuses other formats and files too heavy", async () => {
    await expect(readImportFile(file("x.exe", "MZ"))).rejects.toThrow(/Formats acceptés/);
    const big = new File([new Uint8Array(NOTE_IMPORT_LIMITS.fileBytes + 1)], "big.zip");
    await expect(readImportFile(big)).rejects.toThrow(/trop lourd/);
  });

  it("turns a .zip's directories into folders, and skips what is not a note", async () => {
    const zip = zipSync({
      "Réseau/TCP/handshake.md": strToU8("# Handshake\nSYN"),
      "Réseau/ports.txt": strToU8("22"),
      "Réseau/schema.png": new Uint8Array([1, 2, 3]),
      "__MACOSX/Réseau/._ports.txt": strToU8("x"),
      ".DS_Store": strToU8("x"),
      "../../evil.md": strToU8("# Evil"),
    });
    const res = await readImportFile(file("notes.zip", zip));
    expect(res.notes.map((n) => [n.folders, n.title])).toEqual([
      [[], "Evil"],
      [["Réseau"], "ports"],
      [["Réseau", "TCP"], "Handshake"],
    ]);
    expect(res.skipped.map((s) => s.name)).toEqual(["Réseau/schema.png"]);
  });

  it("drops the whole-library export's top directory, keeps a folder's", async () => {
    const all = buildNotesZip({
      notes: [
        {
          id: "1",
          title: "A",
          content: "x",
          folderId: null,
          lessonTitle: null,
          lessonSlug: null,
          pathTitle: null,
          categoryLabel: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      folders: [],
      rootFolderId: null,
      rootName: ALL_NOTES_ROOT,
      siteUrl: "",
    });
    const res = await readImportFile(file("export.zip", all));
    expect(res.notes).toEqual([{ folders: [], title: "A", content: "x\n" }]);
  });

  it("skips an entry announced past a note's size, before inflating it", async () => {
    const huge = strToU8("a".repeat(NOTE_CONTENT_MAX * 4 + 1));
    const res = await readImportFile(
      file("big-note.zip", zipSync({ "big.md": huge }, { level: 9 })),
    );
    expect(res.notes).toHaveLength(0);
    expect(res.skipped).toEqual([{ name: "big.md", reason: "trop longue" }]);
  });

  it("refuses an archive that unpacks past the limit, a zip bomb included", async () => {
    // Each entry just under a note's size, all of them past the total.
    const chunk = strToU8("a".repeat(NOTE_CONTENT_MAX * 4 - 1));
    const count = Math.ceil(NOTE_IMPORT_LIMITS.unpackedBytes / chunk.length) + 1;
    const entries: Record<string, Uint8Array> = {};
    for (let i = 0; i < count; i += 1) entries[`n${String(i)}.md`] = chunk;
    const zip = zipSync(entries, { level: 9 });
    expect(zip.length).toBeLessThan(NOTE_IMPORT_LIMITS.fileBytes);
    await expect(readImportFile(file("bomb.zip", zip))).rejects.toThrow(/trop volumineuse/);
  });

  it("refuses an archive with too many entries", async () => {
    const entries: Record<string, Uint8Array> = {};
    for (let i = 0; i <= NOTE_IMPORT_LIMITS.entries; i += 1)
      entries[`n${String(i)}.md`] = strToU8("x");
    await expect(readImportFile(file("many.zip", zipSync(entries)))).rejects.toThrow(
      /fichiers au plus/,
    );
  });
});

describe("importBatches", () => {
  it("cuts batches under the body limit and at 100 notes", () => {
    const notes = Array.from({ length: 250 }, (_, i) => ({
      folders: [],
      title: `n${String(i)}`,
      content: "x",
    }));
    expect(importBatches(notes).map((b) => b.length)).toEqual([100, 100, 50]);
    const heavy = Array.from({ length: 5 }, () => ({
      folders: [],
      title: "t",
      content: "y".repeat(300_000),
    }));
    expect(importBatches(heavy).map((b) => b.length)).toEqual([2, 2, 1]);
  });
});
