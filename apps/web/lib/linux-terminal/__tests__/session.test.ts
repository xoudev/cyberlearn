import { describe, expect, it } from "vitest";
import {
  checkHolds,
  createLineTracker,
  directoriesOf,
  endsWithPrompt,
  isLessonFilePath,
  normalizeCommand,
  setupCommand,
  toSerial,
} from "../session";

describe("isLessonFilePath", () => {
  it.each([
    "notes.txt",
    "projet/rapport-final.txt",
    "a/b/c.sh",
    "journal.2026-09.log",
    ".bashrc",
    ".cache/indice.txt",
  ])("accepts %s", (path) => {
    expect(isLessonFilePath(path)).toBe(true);
  });

  it.each([
    "../etc/passwd",
    "/etc/passwd",
    "a/../b",
    "a//b",
    "a b",
    "a;rm -rf /",
    "$(id)",
    "./notes.txt",
    "..",
    "",
  ])("refuses %s", (path) => {
    expect(isLessonFilePath(path)).toBe(false);
  });
});

describe("directoriesOf", () => {
  it("lists each directory once, parents first", () => {
    expect(directoriesOf(["a/b/c.txt", "a/d.txt", "e.txt", "f/g.txt"])).toEqual(["a", "f", "a/b"]);
  });

  it("needs none for files at the top", () => {
    expect(directoriesOf(["notes.txt"])).toEqual([]);
  });
});

describe("setupCommand", () => {
  it("sizes the terminal, creates the directories, starts in /mnt and clears", () => {
    expect(setupCommand(["projet/notes.txt", "lisezmoi.txt"], 96, 20)).toBe(
      "stty cols 96 rows 20; mkdir -p '/mnt/projet'; cd /mnt; clear\n",
    );
  });

  it("creates nothing when there is nothing to create", () => {
    expect(setupCommand([], 80, 24)).toBe("stty cols 80 rows 24; cd /mnt; clear\n");
  });
});

describe("endsWithPrompt", () => {
  it("recognises the shell waiting, wherever it is", () => {
    expect(endsWithPrompt("Files send via emulator appear in /mnt/\r\n~% ")).toBe(true);
    expect(endsWithPrompt("\x1b[H\x1b[J/mnt% ")).toBe(true);
    expect(endsWithPrompt("Linux (none) 6.8.12\r\n")).toBe(false);
  });
});

describe("normalizeCommand", () => {
  it("trims and collapses spaces", () => {
    expect(normalizeCommand("  ls   -l  /etc ")).toBe("ls -l /etc");
  });
});

describe("toSerial", () => {
  it("sends plain text unchanged", () => {
    expect(toSerial("ls -l\r")).toBe("ls -l\r");
  });

  it("sends an accent as its UTF-8 bytes", () => {
    const sent = toSerial("é");
    expect(sent).toHaveLength(2);
    expect([sent.charCodeAt(0), sent.charCodeAt(1)]).toEqual([0xc3, 0xa9]);
  });
});

describe("createLineTracker", () => {
  function track(...chunks: string[]): string[] {
    const lines: string[] = [];
    const feed = createLineTracker((line) => lines.push(line));
    for (const chunk of chunks) feed(chunk);
    return lines;
  }

  it("reports a line typed key by key", () => {
    expect(track("l", "s", " ", "-", "l", "\r")).toEqual(["ls -l"]);
  });

  it("follows erasing", () => {
    expect(track("lx", "\x7f", "s\r")).toEqual(["ls"]);
  });

  it("reports a pasted block line by line", () => {
    expect(track("whoami\rid\r")).toEqual(["whoami", "id"]);
  });

  it("forgets an empty line and an abandoned one", () => {
    expect(track("\r", "rm -rf /tmp/x\x03", "pwd\r")).toEqual(["pwd"]);
  });

  it("does not guess a line recalled or edited with the arrows", () => {
    expect(track("\x1b[A", "\r", "ls\x1b[D", "x\r", "id\r")).toEqual(["id"]);
  });
});

describe("createLineTracker, on Enter", () => {
  it("signals every Enter, even for a line it cannot report", () => {
    let enters = 0;
    const feed = createLineTracker(
      () => undefined,
      () => {
        enters++;
      },
    );
    feed("ls\r");
    feed("\x1b[A\r");
    feed("\r");
    expect(enters).toBe(3);
  });
});

describe("checkHolds", () => {
  const file = { label: "Le rapport", path: "docs/rapport.txt", expect: "file" as const };

  it("holds when the path is what the check expects", () => {
    expect(checkHolds(file, "file", "texte")).toBe(true);
    expect(checkHolds({ ...file, expect: "dir" }, "dir", null)).toBe(true);
    expect(checkHolds({ ...file, expect: "absent" }, "absent", null)).toBe(true);
  });

  it("fails when the path is something else", () => {
    expect(checkHolds(file, "absent", null)).toBe(false);
    expect(checkHolds(file, "dir", null)).toBe(false);
    expect(checkHolds({ ...file, expect: "absent" }, "file", "x")).toBe(false);
  });

  it("looks for the expected text in a file", () => {
    const withText = { ...file, contains: "Bilan" };
    expect(checkHolds(withText, "file", "Bilan du trimestre")).toBe(true);
    expect(checkHolds(withText, "file", "Brouillon")).toBe(false);
    expect(checkHolds(withText, "file", null)).toBe(false);
  });
});
