/**
 * Writes a CTF challenge from a content/challenges file: the one way a
 * challenge of the repository reaches the database, from the console's
 * "Synchroniser avec le dépôt" page.
 *
 * Idempotent. A new challenge arrives inactive: publishing stays a decision
 * taken in the console, as for a lesson. An existing one (same refCode) is
 * rewritten from the file and keeps whether it is active, and its learners'
 * progress. Hints are matched by their place: the first hint of the file
 * rewrites the first hint stored, and so on, so a learner who paid for a hint
 * keeps it; a hint no longer in the file goes, with who had revealed it.
 */

import type { PrismaClient } from "@prisma/client";
import type { ChallengeFile } from "@cyberlearn/types";
import { changedValue, type CatalogueChange } from "./changes";

export interface ChallengeSyncResult {
  challengeId: string;
  /** False when the refCode was already in the database, now rewritten. */
  created: boolean;
  hints: number;
}

/** A refusal in the author's terms, for the console to show as it is. */
export class ChallengeSyncError extends Error {}

/** The machine as the Json column stores it: no undefined in it. */
function machineJson(machine: ChallengeFile["machine"]): {
  title?: string;
  files: Record<string, string>;
} {
  return machine.title === undefined
    ? { files: machine.files }
    : { title: machine.title, files: machine.files };
}

export async function syncChallenge(
  client: PrismaClient,
  file: ChallengeFile,
): Promise<ChallengeSyncResult> {
  return client.$transaction(async (tx) => {
    let prerequisiteId: string | null = null;
    if (file.prerequisite !== undefined) {
      const prerequisite = await tx.challenge.findUnique({
        where: { refCode: file.prerequisite },
        select: { id: true },
      });
      if (prerequisite === null) {
        throw new ChallengeSyncError(
          `Le prérequis ${file.prerequisite} n'est pas encore en base : synchronise-le d'abord.`,
        );
      }
      prerequisiteId = prerequisite.id;
    }

    const fields = {
      slug: file.slug,
      title: file.title,
      description: file.description,
      instructions: file.instructions,
      category: file.category,
      difficulty: file.difficulty,
      type: "CTF" as const,
      xpReward: file.xpReward,
      maxAttempts: file.maxAttempts,
      orderIndex: file.orderIndex,
      timeLimitMin: 0,
      // The flag is each learner's own, computed from the machine.
      flag: null,
      machine: machineJson(file.machine),
      starterCode: null,
      attachmentUrl: null,
      resourceUrl: null,
      prerequisiteId,
    };

    const existing = await tx.challenge.findUnique({
      where: { refCode: file.refCode },
      select: { id: true },
    });
    const saved =
      existing === null
        ? await tx.challenge.create({
            data: { refCode: file.refCode, ...fields, isActive: false },
            select: { id: true },
          })
        : await tx.challenge.update({
            where: { id: existing.id },
            data: fields,
            select: { id: true },
          });

    const stored = await tx.challengeHint.findMany({
      where: { challengeId: saved.id },
      orderBy: { orderIndex: "asc" },
      select: { id: true },
    });
    for (const [orderIndex, hint] of file.hints.entries()) {
      const row = stored[orderIndex];
      const data = { content: hint.content, xpCost: hint.xpCost, orderIndex };
      if (row === undefined) {
        await tx.challengeHint.create({ data: { challengeId: saved.id, ...data } });
      } else {
        await tx.challengeHint.update({ where: { id: row.id }, data });
      }
    }
    const extra = stored.slice(file.hints.length).map((row) => row.id);
    if (extra.length > 0) await tx.challengeHint.deleteMany({ where: { id: { in: extra } } });

    return { challengeId: saved.id, created: existing === null, hints: file.hints.length };
  });
}

/** A challenge as the database holds it, for comparing with its file. */
export interface StoredChallenge {
  slug: string;
  title: string;
  description: string;
  instructions: string;
  category: string;
  difficulty: string;
  type: string;
  xpReward: number;
  maxAttempts: number;
  orderIndex: number;
  machine: unknown;
  prerequisiteRefCode: string | null;
  hints: { content: string; xpCost: number }[];
}

/** The files of a stored machine, whatever order the database kept the keys in. */
function storedFiles(machine: unknown): Record<string, unknown> | null {
  if (typeof machine !== "object" || machine === null || !("files" in machine)) return null;
  const files = machine.files;
  return typeof files === "object" && files !== null ? { ...files } : null;
}

function storedTitle(machine: unknown): unknown {
  return typeof machine === "object" && machine !== null && "title" in machine
    ? machine.title
    : undefined;
}

/** Whether the database already holds what the file says. */
export function challengeMatches(stored: StoredChallenge, file: ChallengeFile): boolean {
  const files = storedFiles(stored.machine);
  const sameFiles =
    files !== null &&
    Object.keys(files).length === Object.keys(file.machine.files).length &&
    Object.entries(file.machine.files).every(([path, content]) => files[path] === content);
  return (
    sameFiles &&
    storedTitle(stored.machine) === file.machine.title &&
    stored.slug === file.slug &&
    stored.title === file.title &&
    stored.description === file.description &&
    stored.instructions === file.instructions &&
    stored.category === file.category &&
    stored.difficulty === file.difficulty &&
    stored.type === "CTF" &&
    stored.xpReward === file.xpReward &&
    stored.maxAttempts === file.maxAttempts &&
    stored.orderIndex === file.orderIndex &&
    stored.prerequisiteRefCode === (file.prerequisite ?? null) &&
    stored.hints.length === file.hints.length &&
    file.hints.every((hint, i) => {
      const row = stored.hints.at(i);
      return row?.content === hint.content && row.xpCost === hint.xpCost;
    })
  );
}

/**
 * What syncChallenge would change, in words: each field the file rewrites,
 * the machine's files, and the hints, matched by their place as the sync
 * matches them. Empty when challengeMatches holds; the console lists it
 * before anyone confirms a sync.
 */
export function challengeChanges(stored: StoredChallenge, file: ChallengeFile): CatalogueChange[] {
  const title = storedTitle(stored.machine);
  const changes: CatalogueChange[] = [
    ...changedValue("Titre", stored.title, file.title),
    ...changedValue("Slug", stored.slug, file.slug),
    ...changedValue("Domaine", stored.category, file.category),
    ...changedValue("Difficulté", stored.difficulty, file.difficulty),
    ...changedValue("Type", stored.type, "CTF"),
    ...changedValue("XP", stored.xpReward, file.xpReward),
    ...changedValue("Essais", stored.maxAttempts, file.maxAttempts),
    ...changedValue("Ordre", stored.orderIndex, file.orderIndex),
    ...changedValue("Prérequis", stored.prerequisiteRefCode, file.prerequisite ?? null),
    ...changedValue(
      "Machine (titre)",
      typeof title === "string" ? title : null,
      file.machine.title ?? null,
    ),
  ];
  if (stored.description !== file.description) {
    changes.push({ kind: "modified", label: "Description", value: "Texte réécrit." });
  }
  if (stored.instructions !== file.instructions) {
    changes.push({ kind: "modified", label: "Énoncé", value: "Texte réécrit." });
  }

  const files = storedFiles(stored.machine) ?? {};
  const rewritten = [...new Set([...Object.keys(files), ...Object.keys(file.machine.files)])]
    .filter((path) => files[path] !== file.machine.files[path])
    .sort();
  if (rewritten.length > 0) {
    changes.push({
      kind: "modified",
      label: "Machine",
      value: `Fichiers réécrits : ${rewritten.join(", ")}.`,
    });
  }

  for (let i = 0; i < Math.max(stored.hints.length, file.hints.length); i++) {
    const label = `Indice ${String(i + 1)}`;
    const saved = stored.hints.at(i);
    const hint = file.hints.at(i);
    if (!saved && hint) changes.push({ kind: "added", label, value: hint.content });
    else if (saved && !hint) changes.push({ kind: "removed", label, value: saved.content });
    else if (saved && hint) {
      if (saved.content !== hint.content) {
        changes.push({ kind: "modified", label, value: hint.content });
      }
      changes.push(
        ...changedValue(
          `${label} (coût)`,
          `${String(saved.xpCost)} XP`,
          `${String(hint.xpCost)} XP`,
        ),
      );
    }
  }
  return changes;
}
