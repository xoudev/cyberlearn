import { describe, expect, it } from "vitest";
import {
  checkFolderMove,
  cleanNoteTitle,
  folderAncestors,
  folderDepth,
  folderDescendants,
  folderPath,
  NOTE_FOLDER_MAX_DEPTH,
  NOTE_TITLE_MAX,
  noteDisplayTitle,
  parentMap,
  subtreeHeight,
} from "../workspace";

/**
 * Folders nest: A > B > C, and D at the root. The rules the repository checks
 * before writing a move, and the library before offering one.
 */
const folders = [
  { id: "A", parentId: null, name: "Réseau" },
  { id: "B", parentId: "A", name: "TCP" },
  { id: "C", parentId: "B", name: "Handshake" },
  { id: "D", parentId: null, name: "Web" },
];
const parents = parentMap(folders);

describe("folder tree", () => {
  it("reads ancestors, depth, descendants and height", () => {
    expect(folderAncestors(parents, "C")).toEqual(["A", "B"]);
    expect(folderDepth(parents, "C")).toBe(3);
    expect([...folderDescendants(parents, "A")].sort()).toEqual(["B", "C"]);
    expect(subtreeHeight(parents, "A")).toBe(3);
    expect(subtreeHeight(parents, "D")).toBe(1);
  });

  it("reads a parent that is not one of the user's folders as the root", () => {
    const map = parentMap([{ id: "X", parentId: "someone-else" }]);
    expect(map.get("X")).toBeNull();
  });

  it("survives a cycle written behind its back", () => {
    const cyclic = parentMap([
      { id: "P", parentId: "Q" },
      { id: "Q", parentId: "P" },
    ]);
    expect(folderAncestors(cyclic, "P")).toEqual(["Q"]);
  });

  it("names the path of a folder", () => {
    expect(folderPath(folders, "C")).toEqual(["Réseau", "TCP", "Handshake"]);
    expect(folderPath(folders, null)).toEqual([]);
  });
});

describe("checkFolderMove", () => {
  it("refuses a folder into itself or its own subtree", () => {
    expect(checkFolderMove(parents, "A", "A")).toBe("self");
    expect(checkFolderMove(parents, "A", "C")).toBe("cycle");
  });

  it("refuses a move past the depth limit", () => {
    // A's subtree is 3 deep; under D it would reach 4, under C it would pass.
    expect(NOTE_FOLDER_MAX_DEPTH).toBe(4);
    expect(checkFolderMove(parents, "A", "D")).toBeNull();
    expect(checkFolderMove(parents, "D", "C")).toBeNull();
    const deeper = parentMap([...folders, { id: "E", parentId: "D" }]);
    expect(checkFolderMove(deeper, "D", "C")).toBe("depth");
  });

  it("lets anything go back to the root", () => {
    expect(checkFolderMove(parents, "C", null)).toBeNull();
  });
});

describe("titles", () => {
  it("shows a note's own title, else its lesson's", () => {
    expect(noteDisplayTitle("  Mes ports ", "Les ports")).toBe("Mes ports");
    expect(noteDisplayTitle("", "Les ports")).toBe("Les ports");
    expect(noteDisplayTitle("", null)).toBe("Note sans titre");
  });

  it("cleans a title to one line within the limit", () => {
    expect(cleanNoteTitle("  a\n\tb\u0000c  ")).toBe("a b c");
    expect(cleanNoteTitle("x".repeat(500))).toHaveLength(NOTE_TITLE_MAX);
  });
});
