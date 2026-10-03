import { z } from "zod";
import { challengeMachineSchema } from "./challenge-machine.schema.js";

/**
 * A CTF challenge as the repository holds it: content/challenges/<slug>.json,
 * brought into the database by the console's "Synchroniser avec le dépôt" page
 * (packages/db/src/catalogue/challenge-sync.ts), inactive until published.
 *
 * Only CTFs played on a Linux machine live here: the machine is what makes a
 * file of the repository enough to describe the whole challenge, and its
 * flag is each learner's own, so nothing secret is committed.
 */

export const CHALLENGE_REF_CODE = /^CL-CHG-\d{3}$/u;

const hintSchema = z
  .object({
    content: z.string().trim().min(1).max(1000),
    /** XP the learner spends to read it. */
    xpCost: z.number().int().min(0).max(100),
  })
  .strict();

export const challengeFileSchema = z
  .object({
    refCode: z.string().regex(CHALLENGE_REF_CODE, "refCode au format CL-CHG-001"),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "slug en minuscules, chiffres et tirets")
      .max(100),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(1000),
    /** Markdown, shown above the machine. */
    instructions: z.string().trim().min(1).max(20_000),
    category: z.enum(["CYBERSEC", "DEV", "NETWORK"]),
    difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
    // Kept modest: the flag is the learner's own, but the machine is in their
    // browser, and a determined learner can read it there.
    xpReward: z.number().int().min(1).max(300),
    maxAttempts: z.number().int().min(1).max(100),
    orderIndex: z.number().int().min(0),
    /** The refCode of a challenge to solve first. */
    prerequisite: z.string().regex(CHALLENGE_REF_CODE).optional(),
    machine: challengeMachineSchema,
    hints: z.array(hintSchema).max(5).default([]),
  })
  .strict();

export type ChallengeFile = z.infer<typeof challengeFileSchema>;

/** Reads a challenge file, or says in French what is wrong, prefixed with where. */
export function parseChallengeFile(
  raw: unknown,
): { ok: true; challenge: ChallengeFile } | { ok: false; problem: string } {
  const parsed = challengeFileSchema.safeParse(raw);
  if (parsed.success) return { ok: true, challenge: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "fichier invalide."}` };
}
