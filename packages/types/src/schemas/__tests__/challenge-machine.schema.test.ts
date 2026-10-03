import { describe, expect, it } from "vitest";
import {
  FLAG_PLACEHOLDER,
  isLessonFilePath,
  machineFilesWithFlag,
  parseChallengeMachine,
} from "../challenge-machine.schema.js";

const MACHINE = {
  title: "Le serveur oublié",
  files: {
    "logs/auth.log": "Accepted password for admin\n",
    ".cache/.notes.txt": `le code : ${FLAG_PLACEHOLDER}\nencore : ${FLAG_PLACEHOLDER}\n`,
  },
};

describe("parseChallengeMachine", () => {
  it("accepts files with a place for the flag", () => {
    expect(parseChallengeMachine(MACHINE)).toEqual({ ok: true, machine: MACHINE });
  });

  it("refuses a machine where the flag has nowhere to go", () => {
    expect(parseChallengeMachine({ files: { "a.txt": "rien" } })).toEqual({
      ok: false,
      problem:
        "Aucun fichier ne contient {{FLAG}} : le flag de l'élève n'aurait nulle part où aller.",
    });
  });

  it.each([
    ["no file", { files: {} }],
    ["a path leaving /mnt", { files: { "../etc/passwd": FLAG_PLACEHOLDER } }],
    ["an absolute path", { files: { "/root/flag": FLAG_PLACEHOLDER } }],
    [
      "more than 40 files",
      {
        files: Object.fromEntries(
          Array.from({ length: 41 }, (_, i) => [`f${String(i)}.txt`, FLAG_PLACEHOLDER]),
        ),
      },
    ],
    ["files that are not text", { files: { "a.txt": 42 } }],
  ])("refuses %s", (_label, raw) => {
    expect(parseChallengeMachine(raw).ok).toBe(false);
  });
});

describe("machineFilesWithFlag", () => {
  it("writes the learner's flag everywhere the author put the placeholder", () => {
    const files = machineFilesWithFlag(MACHINE, "CL{0123456789abcdef0123}");
    expect(files[".cache/.notes.txt"]).toBe(
      "le code : CL{0123456789abcdef0123}\nencore : CL{0123456789abcdef0123}\n",
    );
    expect(files["logs/auth.log"]).toBe(MACHINE.files["logs/auth.log"]);
  });
});

describe("isLessonFilePath", () => {
  it.each(["notes.txt", ".cache/.notes.txt", "rapport final.txt", "logs/2026/auth.log"])(
    "accepts %s",
    (path) => {
      expect(isLessonFilePath(path)).toBe(true);
    },
  );

  it.each(["", "/abs", "a/../b", "./a", "dir with space/a.txt", "a/"])("refuses %j", (path) => {
    expect(isLessonFilePath(path)).toBe(false);
  });
});
