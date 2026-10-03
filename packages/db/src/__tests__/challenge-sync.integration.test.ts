/**
 * Writing a challenge from its repository file, against real rows: a new one
 * arrives inactive, a second sync keeps what the console decided, hints are
 * rewritten in place, and a prerequisite must be there first.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. RefCodes and slugs are namespaced by a run suffix and removed in
 * afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { parseChallengeFile, type ChallengeFile } from "@cyberlearn/types";
import { prisma } from "../prisma.js";
import { ChallengeSyncError, syncChallenge } from "../catalogue/challenge-sync.js";

const n = String(Math.floor(Math.random() * 900) + 100);
const suffix = randomUUID().slice(0, 8);
const FIRST = `CL-CHG-${n}`;
// A second refCode of the same run, never the first.
const SECOND = `CL-CHG-${String(((Number(n) - 100 + 1) % 900) + 100)}`;

function file(overrides: Record<string, unknown> = {}): ChallengeFile {
  const parsed = parseChallengeFile({
    refCode: FIRST,
    slug: `sync-${suffix}`,
    title: "Le journal",
    description: "Pour le test.",
    instructions: "Trouve le flag.",
    category: "CYBERSEC",
    difficulty: "BEGINNER",
    xpReward: 50,
    maxAttempts: 5,
    orderIndex: 1,
    machine: { title: "web01", files: { "logs/auth.log": "x {{FLAG}}" } },
    hints: [
      { content: "Premier indice.", xpCost: 10 },
      { content: "Deuxième indice.", xpCost: 20 },
    ],
    ...overrides,
  });
  if (!parsed.ok) throw new Error(parsed.problem);
  return parsed.challenge;
}

const configured = Boolean(process.env["DATABASE_URL"]);

describe("syncChallenge (integration, real DB)", () => {
  afterAll(async () => {
    if (!configured) return;
    await prisma.challenge.deleteMany({ where: { refCode: { in: [SECOND] } } });
    await prisma.challenge.deleteMany({ where: { refCode: { in: [FIRST] } } });
  });

  it("creates a new challenge inactive, with its machine and hints", async () => {
    if (!configured) return;
    const result = await syncChallenge(prisma, file());
    expect(result).toMatchObject({ created: true, hints: 2 });

    const row = await prisma.challenge.findUniqueOrThrow({
      where: { refCode: FIRST },
      select: {
        isActive: true,
        type: true,
        flag: true,
        machine: true,
        hints: { orderBy: { orderIndex: "asc" }, select: { content: true, xpCost: true } },
      },
    });
    expect(row).toEqual({
      isActive: false,
      type: "CTF",
      flag: null,
      machine: { title: "web01", files: { "logs/auth.log": "x {{FLAG}}" } },
      hints: [
        { content: "Premier indice.", xpCost: 10 },
        { content: "Deuxième indice.", xpCost: 20 },
      ],
    });
  });

  it("rewrites it from the file, keeps it active, and keeps a hint someone paid for", async () => {
    if (!configured) return;
    await prisma.challenge.update({ where: { refCode: FIRST }, data: { isActive: true } });
    const firstHint = await prisma.challengeHint.findFirstOrThrow({
      where: { challenge: { refCode: FIRST }, orderIndex: 0 },
      select: { id: true },
    });

    const result = await syncChallenge(
      prisma,
      file({ title: "Le journal bavard", hints: [{ content: "Indice revu.", xpCost: 5 }] }),
    );
    expect(result).toMatchObject({ created: false, hints: 1 });

    const row = await prisma.challenge.findUniqueOrThrow({
      where: { refCode: FIRST },
      select: {
        isActive: true,
        title: true,
        hints: { select: { id: true, content: true, xpCost: true } },
      },
    });
    expect(row.isActive).toBe(true);
    expect(row.title).toBe("Le journal bavard");
    expect(row.hints).toEqual([{ id: firstHint.id, content: "Indice revu.", xpCost: 5 }]);
  });

  it("links a prerequisite already there, and refuses one that is not", async () => {
    if (!configured) return;
    await expect(
      syncChallenge(
        prisma,
        file({ refCode: SECOND, slug: `sync2-${suffix}`, prerequisite: "CL-CHG-000" }),
      ),
    ).rejects.toBeInstanceOf(ChallengeSyncError);

    await syncChallenge(
      prisma,
      file({ refCode: SECOND, slug: `sync2-${suffix}`, prerequisite: FIRST }),
    );
    const second = await prisma.challenge.findUniqueOrThrow({
      where: { refCode: SECOND },
      select: { prerequisite: { select: { refCode: true } } },
    });
    expect(second.prerequisite?.refCode).toBe(FIRST);
  });
});
