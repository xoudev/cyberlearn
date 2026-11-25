import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  ALL_NOTES_ROOT,
  archiveEntries,
  buildNotesZip,
  noteFileContent,
  safeFileName,
  type ArchiveFolder,
  type ArchiveNote,
} from "../archive";

/**
 * The .zip export: the folders become directories, each note a .md named
 * after its title, with a YAML header. Built in the browser.
 */

const folders: ArchiveFolder[] = [
  { id: "net", name: "Réseau", parentId: null },
  { id: "tcp", name: "TCP/IP", parentId: "net" },
  { id: "web", name: "Web", parentId: null },
];

const note = (over: Partial<ArchiveNote>): ArchiveNote => ({
  id: "n",
  title: "Note",
  content: "Contenu",
  folderId: null,
  lessonTitle: null,
  lessonSlug: null,
  pathTitle: null,
  categoryLabel: null,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-02T10:00:00.000Z",
  ...over,
});

const notes = [
  note({ id: "1", title: "Handshake", folderId: "tcp" }),
  note({ id: "2", title: "Ports", folderId: "net" }),
  note({ id: "3", title: "Ports", folderId: "net" }),
  note({ id: "4", title: "Idées", folderId: null }),
  note({ id: "5", title: "XSS", folderId: "web" }),
];

describe("safeFileName", () => {
  it("trims trailing dots and spaces as the old pattern did, in linear time", () => {
    expect(safeFileName("Notes...")).toBe("Notes");
    expect(safeFileName("Notes . . .")).toBe("Notes");
    expect(safeFileName("...")).toBe("Sans titre");
    expect(safeFileName(`${"a".repeat(79)}.b`)).toBe("a".repeat(79));
    const started = performance.now();
    safeFileName(`a${".".repeat(50_000)}b`);
    expect(performance.now() - started).toBeLessThan(200);
  });

  it("keeps accents and drops what file systems refuse", () => {
    expect(safeFileName('a/b\\c:d*e?"f<g>h|i')).toBe("a-b-c-d-e--f-g-h-i");
    expect(safeFileName("Modèle OSI")).toBe("Modèle OSI");
    expect(safeFileName("  .caché. ")).toBe("caché");
    expect(safeFileName("CON")).toBe("_CON");
    expect(safeFileName("")).toBe("Sans titre");
    expect(safeFileName("x".repeat(200))).toHaveLength(80);
  });
});

describe("archiveEntries", () => {
  it("mirrors the folders, notes outside any folder at the top", () => {
    const files = archiveEntries({
      notes,
      folders,
      rootFolderId: null,
      rootName: ALL_NOTES_ROOT,
      siteUrl: "https://cyberlearn.fr",
    });
    expect([...files.keys()].sort()).toEqual(
      [
        `${ALL_NOTES_ROOT}/Idées.md`,
        `${ALL_NOTES_ROOT}/Réseau/`,
        `${ALL_NOTES_ROOT}/Réseau/Ports.md`,
        `${ALL_NOTES_ROOT}/Réseau/Ports (2).md`,
        `${ALL_NOTES_ROOT}/Réseau/TCP-IP/`,
        `${ALL_NOTES_ROOT}/Réseau/TCP-IP/Handshake.md`,
        `${ALL_NOTES_ROOT}/Web/`,
        `${ALL_NOTES_ROOT}/Web/XSS.md`,
      ].sort(),
    );
  });

  it("exports one folder and its subfolders, the folder at the top", () => {
    const files = archiveEntries({
      notes,
      folders,
      rootFolderId: "net",
      rootName: "Réseau",
      siteUrl: "",
    });
    expect([...files.keys()].filter((k) => k.endsWith(".md")).sort()).toEqual([
      "Réseau/Ports (2).md",
      "Réseau/Ports.md",
      "Réseau/TCP-IP/Handshake.md",
    ]);
  });
});

describe("noteFileContent", () => {
  it("writes a YAML header any tool reads, quotes escaped", () => {
    const md = noteFileContent(
      note({
        title: 'Le "piège"',
        lessonTitle: "Injection SQL",
        lessonSlug: "injection-sql",
        content: "# Corps",
      }),
      "https://cyberlearn.fr/",
    );
    expect(md).toContain('title: "Le \\"piège\\""');
    expect(md).toContain('lesson_url: "https://cyberlearn.fr/lessons/injection-sql"');
    expect(md.endsWith("---\n\n# Corps\n")).toBe(true);
  });

  it("writes the workspace's colours and callouts the way other readers draw them", () => {
    const md = noteFileContent(
      note({ content: "Port [22]{rouge}, ==ssh==\n\n> [!astuce]\n> chiffré" }),
      "https://cyberlearn.fr",
    );
    expect(md).toContain('Port <span style="color: #C62E3A">22</span>, <mark>ssh</mark>');
    expect(md).toContain("> [!TIP]\n> chiffré");
  });
});

describe("buildNotesZip", () => {
  it("zips what archiveEntries lists, readable back", () => {
    const zip = buildNotesZip({
      notes,
      folders,
      rootFolderId: null,
      rootName: ALL_NOTES_ROOT,
      siteUrl: "",
    });
    const files = unzipSync(zip);
    const handshake = files[`${ALL_NOTES_ROOT}/Réseau/TCP-IP/Handshake.md`];
    expect(handshake).toBeDefined();
    expect(strFromU8(handshake ?? new Uint8Array())).toContain("Contenu");
  });
});
