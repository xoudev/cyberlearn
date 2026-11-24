/**
 * Reads and checks the CTF challenges of the repository,
 * content/challenges/<slug>.json (format: challengeFileSchema in
 * @cyberlearn/types).
 *
 * Used by the console's "Synchroniser avec le dépôt" page, which writes a
 * challenge through ./challenge-sync.ts, and by a unit test that fails the
 * build on a file that would not load: a broken challenge is caught when it is
 * written, not when the console refuses it in production.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { type ChallengeFile, parseChallengeFile } from "@cyberlearn/types";

export interface LoadedChallengeFile {
  file: string;
  challenge: ChallengeFile;
}

/** content/challenges, found by walking up from the working directory. */
export function findChallengeDir(from: string = process.cwd()): string | null {
  let dir = from;
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, "content", "challenges");
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  return null;
}

// Built from its code point: the character itself is banned from the sources.
const EM_DASH = String.fromCodePoint(0x2014);

/**
 * The challenges in an order where each one comes after its prerequisite: the
 * order the console writes them in, since a challenge is refused while its
 * prerequisite is not in the database.
 *
 * The page used to write them in file order, which is alphabetical. With the
 * first three files, dossier-cache (after journal-bavard) came first and was
 * refused; with eight, seven of them were. Among challenges that are free to
 * go, the play order (orderIndex) then the refCode decide. A challenge whose
 * prerequisite is not in the list, or that sits in a cycle, keeps its place
 * at the end, so the console can still say why it is refused.
 */
export function inPrerequisiteOrder(loaded: readonly LoadedChallengeFile[]): LoadedChallengeFile[] {
  const byPlay = [...loaded].sort(
    (a, b) =>
      a.challenge.orderIndex - b.challenge.orderIndex ||
      a.challenge.refCode.localeCompare(b.challenge.refCode),
  );
  const known = new Set(byPlay.map((item) => item.challenge.refCode));
  const placed = new Set<string>();
  const ordered: LoadedChallengeFile[] = [];
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const item of byPlay) {
      const { refCode, prerequisite } = item.challenge;
      if (placed.has(refCode)) continue;
      const ready =
        prerequisite === undefined || placed.has(prerequisite) || !known.has(prerequisite);
      if (!ready) continue;
      ordered.push(item);
      placed.add(refCode);
      progressed = true;
    }
  }
  return [...ordered, ...byPlay.filter((item) => !placed.has(item.challenge.refCode))];
}

/**
 * Every challenge file of the directory, each checked: the format, the file
 * named after its slug, no em-dash (the project's rule for authored text),
 * and across files, refCodes and slugs used once and prerequisites that exist.
 * Returned in prerequisite order (inPrerequisiteOrder).
 */
export function loadChallengeFiles(dir: string): {
  challenges: LoadedChallengeFile[];
  errors: string[];
} {
  const challenges: LoadedChallengeFile[] = [];
  const errors: string[] = [];
  const names = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();

  for (const name of names) {
    const text = readFileSync(join(dir, name), "utf8");
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      errors.push(`[${name}] ce n'est pas du JSON valide`);
      continue;
    }
    const parsed = parseChallengeFile(raw);
    if (!parsed.ok) {
      errors.push(`[${name}] ${parsed.problem}`);
      continue;
    }
    if (`${parsed.challenge.slug}.json` !== name) {
      errors.push(`[${name}] le fichier doit s'appeler ${parsed.challenge.slug}.json`);
      continue;
    }
    if (text.includes(EM_DASH)) {
      errors.push(`[${name}] tiret cadratin : remplace-le par deux-points, virgule ou point`);
      continue;
    }
    challenges.push({ file: name, challenge: parsed.challenge });
  }

  const refCodes = new Set<string>();
  const slugs = new Set<string>();
  for (const { file, challenge } of challenges) {
    if (refCodes.has(challenge.refCode))
      errors.push(`[${file}] refCode ${challenge.refCode} déjà pris`);
    if (slugs.has(challenge.slug)) errors.push(`[${file}] slug ${challenge.slug} déjà pris`);
    refCodes.add(challenge.refCode);
    slugs.add(challenge.slug);
  }
  for (const { file, challenge } of challenges) {
    if (challenge.prerequisite !== undefined && !refCodes.has(challenge.prerequisite)) {
      errors.push(`[${file}] prérequis ${challenge.prerequisite} : aucun défi du dépôt ne l'a`);
    }
  }

  return { challenges: inPrerequisiteOrder(challenges), errors };
}
