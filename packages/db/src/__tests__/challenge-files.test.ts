import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseChallengeFile, type ChallengeFile } from "@cyberlearn/types";
import {
  findChallengeDir,
  inPrerequisiteOrder,
  loadChallengeFiles,
} from "../catalogue/challenge-files";
import {
  challengeChanges,
  challengeMatches,
  type StoredChallenge,
} from "../catalogue/challenge-sync";

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
    timeLimitMin: 0,
    flag: null,
    starterCode: null,
    attachmentUrl: null,
    resourceUrl: null,
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

  it("has nothing to list where it matches, and names each field that differs", () => {
    expect(challengeChanges(stored, file)).toEqual([]);
    expect(
      challengeChanges(
        {
          ...stored,
          xpReward: 40,
          instructions: "Ancien énoncé.",
          prerequisiteRefCode: "CL-CHG-001",
          machine: { files: { "flag.txt": "x", "vieux.txt": "y" } },
          hints: [
            { content: "Regarde flag.txt.", xpCost: 5 },
            { content: "Un indice en trop.", xpCost: 0 },
          ],
        },
        file,
      ),
    ).toEqual([
      { kind: "changed", label: "XP", before: "40", after: "50" },
      { kind: "changed", label: "Prérequis", before: "CL-CHG-001", after: "aucun" },
      { kind: "modified", label: "Énoncé", value: "Texte réécrit." },
      { kind: "modified", label: "Machine", value: "Fichiers réécrits : flag.txt, vieux.txt." },
      { kind: "changed", label: "Indice 1 (coût)", before: "5 XP", after: "10 XP" },
      { kind: "removed", label: "Indice 2", value: "Un indice en trop." },
    ]);
  });

  it("lists what the console set and the sync empties, the flag without its value", () => {
    const edited: StoredChallenge = {
      ...stored,
      timeLimitMin: 30,
      flag: "CL{secret-console}",
      starterCode: "print('hello')",
      attachmentUrl: "https://example.test/dump.pcap",
      resourceUrl: "nc ctf.example.test 1337",
    };
    expect(challengeMatches(edited, file)).toBe(false);
    const changes = challengeChanges(edited, file);
    expect(changes).toEqual([
      { kind: "changed", label: "Durée limite", before: "30 min", after: "aucune" },
      {
        kind: "removed",
        label: "Flag",
        value: "Flag fixe saisi dans la console (non affiché) : chaque joueur reçoit le sien.",
      },
      { kind: "removed", label: "Code de départ", value: "Texte retiré." },
      { kind: "removed", label: "Pièce jointe", value: "https://example.test/dump.pcap" },
      { kind: "removed", label: "Ressource", value: "nc ctf.example.test 1337" },
    ]);
    expect(JSON.stringify(changes)).not.toContain("secret-console");
  });

  it("takes a field the editor saved blank for an empty one", () => {
    const blank: StoredChallenge = { ...stored, flag: "", attachmentUrl: "", resourceUrl: "" };
    expect(challengeMatches(blank, file)).toBe(true);
    expect(challengeChanges(blank, file)).toEqual([]);
  });
});

describe("the order the console writes challenges in", () => {
  function loaded(refCode: string, orderIndex: number, prerequisite?: string) {
    const parsed = parseChallengeFile(
      challenge({
        refCode,
        slug: refCode.toLowerCase(),
        orderIndex,
        ...(prerequisite === undefined ? {} : { prerequisite }),
      }),
    );
    if (!parsed.ok) throw new Error(parsed.problem);
    return { file: `${refCode.toLowerCase()}.json`, challenge: parsed.challenge };
  }
  const refCodes = (list: { challenge: ChallengeFile }[]): string[] =>
    list.map((item) => item.challenge.refCode);

  it("puts every challenge after its prerequisite, whatever the files are called", () => {
    // Alphabetical file order put CL-CHG-002 (after 001) first, and the console refused it.
    const ordered = inPrerequisiteOrder([
      loaded("CL-CHG-903", 3, "CL-CHG-902"),
      loaded("CL-CHG-902", 2, "CL-CHG-901"),
      loaded("CL-CHG-901", 1),
    ]);
    expect(refCodes(ordered)).toEqual(["CL-CHG-901", "CL-CHG-902", "CL-CHG-903"]);
  });

  it("orders the challenges that are free to go by play order, then refCode", () => {
    const ordered = inPrerequisiteOrder([
      loaded("CL-CHG-905", 2),
      loaded("CL-CHG-904", 2),
      loaded("CL-CHG-906", 1),
    ]);
    expect(refCodes(ordered)).toEqual(["CL-CHG-906", "CL-CHG-904", "CL-CHG-905"]);
  });

  it("follows a prerequisite even against the play order", () => {
    const ordered = inPrerequisiteOrder([
      loaded("CL-CHG-910", 1, "CL-CHG-911"),
      loaded("CL-CHG-911", 9),
    ]);
    expect(refCodes(ordered)).toEqual(["CL-CHG-911", "CL-CHG-910"]);
  });

  it("keeps a challenge whose prerequisite is elsewhere, and a cycle, rather than losing them", () => {
    const ordered = inPrerequisiteOrder([
      loaded("CL-CHG-920", 1, "CL-CHG-999"),
      loaded("CL-CHG-921", 1, "CL-CHG-922"),
      loaded("CL-CHG-922", 2, "CL-CHG-921"),
    ]);
    expect(refCodes(ordered)).toEqual(["CL-CHG-920", "CL-CHG-921", "CL-CHG-922"]);
  });

  it("is the order the repository's own challenges load in", () => {
    const dirFound = findChallengeDir();
    if (dirFound === null) throw new Error("content/challenges not found");
    const { challenges } = loadChallengeFiles(dirFound);
    const seen = new Set<string>();
    for (const { challenge: c } of challenges) {
      if (c.prerequisite !== undefined) expect(seen, c.refCode).toContain(c.prerequisite);
      seen.add(c.refCode);
    }
  });
});
