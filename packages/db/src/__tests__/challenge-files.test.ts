import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseChallengeFile, type ChallengeFile } from "@cyberlearn/types";
import { findChallengeDir, loadChallengeFiles } from "../catalogue/challenge-files";
import { challengeMatches, type StoredChallenge } from "../catalogue/challenge-sync";

function challenge(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    refCode: "CL-CHG-901",
    slug: "test-un",
    title: "Un défi",
    description: "Pour les tests.",
    instructions: "## Mission\n\nTrouve le flag.",
    category: "CYBERSEC",
    difficulty: "BEGINNER",
    xpReward: 50,
    maxAttempts: 5,
    orderIndex: 1,
    machine: { files: { "flag.txt": "{{FLAG}}" } },
    hints: [{ content: "Regarde flag.txt.", xpCost: 10 }],
    ...overrides,
  };
}

let dir: string | null = null;
function folder(files: Record<string, unknown>): string {
  dir = mkdtempSync(join(tmpdir(), "challenges-"));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(
      join(dir, name),
      typeof content === "string" ? content : JSON.stringify(content),
      "utf8",
    );
  }
  return dir;
}
afterEach(() => {
  if (dir !== null) rmSync(dir, { recursive: true, force: true });
  dir = null;
});

describe("content/challenges", () => {
  it("are all valid, as the repository holds them", () => {
    const found = findChallengeDir();
    if (found === null) throw new Error("content/challenges not found");
    const { challenges, errors } = loadChallengeFiles(found);
    expect(errors).toEqual([]);
    expect(challenges.length).toBeGreaterThanOrEqual(3);
  });
});

describe("loadChallengeFiles", () => {
  it("reads a well-formed challenge", () => {
    const { challenges, errors } = loadChallengeFiles(folder({ "test-un.json": challenge() }));
    expect(errors).toEqual([]);
    expect(challenges[0]?.challenge.slug).toBe("test-un");
  });

  it("wants the file named after the slug", () => {
    const { errors } = loadChallengeFiles(folder({ "autre.json": challenge() }));
    expect(errors).toEqual(["[autre.json] le fichier doit s'appeler test-un.json"]);
  });

  it("refuses JSON that does not parse, and a machine without a place for the flag", () => {
    const { errors } = loadChallengeFiles(
      folder({
        "a.json": "{ pas du json",
        "test-un.json": challenge({ machine: { files: { "a.txt": "rien" } } }),
      }),
    );
    expect(errors).toHaveLength(2);
    expect(errors[0]).toBe("[a.json] ce n'est pas du JSON valide");
    expect(errors[1]).toContain("machine.files");
  });

  it("refuses a refCode taken twice and a prerequisite no file has", () => {
    const { errors } = loadChallengeFiles(
      folder({
        "test-un.json": challenge(),
        "test-deux.json": challenge({ slug: "test-deux" }),
        "test-trois.json": challenge({
          slug: "test-trois",
          refCode: "CL-CHG-903",
          prerequisite: "CL-CHG-999",
        }),
      }),
    );
    expect(errors).toContain("[test-un.json] refCode CL-CHG-901 déjà pris");
    expect(errors).toContain("[test-trois.json] prérequis CL-CHG-999 : aucun défi du dépôt ne l'a");
  });

  it("refuses an em-dash in authored text", () => {
    const dash = String.fromCodePoint(0x2014);
    const { errors } = loadChallengeFiles(
      folder({ "test-un.json": challenge({ description: `Avant ${dash} après.` }) }),
    );
    expect(errors[0]).toContain("tiret cadratin");
  });
});

describe("challengeMatches", () => {
  const parsed = parseChallengeFile(challenge());
  if (!parsed.ok) throw new Error(parsed.problem);
  const file: ChallengeFile = parsed.challenge;
  const stored: StoredChallenge = {
    slug: file.slug,
    title: file.title,
    description: file.description,
    instructions: file.instructions,
    category: file.category,
    difficulty: file.difficulty,
    type: "CTF",
    xpReward: file.xpReward,
    maxAttempts: file.maxAttempts,
    orderIndex: file.orderIndex,
    machine: { files: { "flag.txt": "{{FLAG}}" } },
    prerequisiteRefCode: null,
    hints: [{ content: "Regarde flag.txt.", xpCost: 10 }],
  };

  it("sees a challenge the database already holds", () => {
    expect(challengeMatches(stored, file)).toBe(true);
  });

  it("sees a change in the machine, the hints or the prerequisite", () => {
    expect(challengeMatches({ ...stored, machine: { files: { "flag.txt": "x" } } }, file)).toBe(
      false,
    );
    expect(challengeMatches({ ...stored, hints: [] }, file)).toBe(false);
    expect(challengeMatches({ ...stored, prerequisiteRefCode: "CL-CHG-001" }, file)).toBe(false);
  });
});
