import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  MODERATION_SURFACE,
  moderationRepository,
  prisma,
  writeupRepository,
} from "@cyberlearn/db";
import { FLAG_BUDGET_MESSAGE, excerpt } from "@cyberlearn/lib";
import { announceModeration } from "@/lib/moderation/announce";
import { checkQaSubmission } from "@/lib/rate-limit";

/**
 * Write-ups: after solving a challenge, a learner publishes their solution,
 * and reads the solutions of the others who solved it. Somebody still
 * looking sees only how many there are: a write-up is the answer.
 *
 * Shared by the site (the challenge page's actions) and the app
 * (/api/mobile/challenges/writeups), so a solution from a phone is limited,
 * screened, held and announced exactly like one from the site. Callers are
 * responsible for AUTHENTICATION: `userId` must be a verified identity.
 */

export interface WriteupAuthor {
  name: string;
  username: string | null;
}

export interface WriteupView {
  id: string;
  content: string;
  /** Null for an erased account: the solution stays, without its author. */
  author: WriteupAuthor | null;
  updatedAt: string;
}

export interface OwnWriteup {
  content: string;
  /** Held for review: written, not shown to anybody else yet. */
  isHidden: boolean;
  updatedAt: string;
}

export type WriteupBoard =
  | { solved: false; count: number }
  | { solved: true; count: number; own: OwnWriteup | null; others: WriteupView[] };

export type WriteupResult = { ok: true; heldForReview?: true } | { ok: false; error: string };

const challengeId = z.guid();

const publishSchema = z.object({
  challengeId,
  content: z
    .string()
    .trim()
    .min(40, "Une solution de 40 caractères au minimum : explique ta démarche.")
    .max(10000, "10 000 caractères au plus pour une solution."),
});

const TOO_FAST = "Trop de messages. Réessayez dans une minute.";
const NOT_FOUND = "Défi introuvable.";

async function findActive(id: string): Promise<{ slug: string } | null> {
  return prisma.challenge.findFirst({ where: { id, isActive: true }, select: { slug: true } });
}

function authorOf(
  user: { displayName: string; username: string | null } | null,
): WriteupAuthor | null {
  if (user === null) return null;
  return { name: user.displayName || (user.username ?? "Sans nom"), username: user.username };
}

/**
 * What the reader may see of a challenge's write-ups: the count only until
 * they solve it, then their own (held or not) and the others' that are up.
 * Null for a challenge that is not there.
 */
export async function writeupBoardFor(
  userId: string,
  rawId: unknown,
): Promise<WriteupBoard | null> {
  const id = challengeId.safeParse(rawId);
  if (!id.success || (await findActive(id.data)) === null) return null;
  const [solved, count] = await Promise.all([
    writeupRepository.hasSolved(userId, id.data),
    writeupRepository.countVisible(id.data),
  ]);
  if (!solved) return { solved: false, count };
  const [own, others] = await Promise.all([
    writeupRepository.findOwn(userId, id.data),
    writeupRepository.listOthers(id.data, userId),
  ]);
  return {
    solved: true,
    count,
    own:
      own === null
        ? null
        : { content: own.content, isHidden: own.isHidden, updatedAt: own.updatedAt.toISOString() },
    others: others.map((w) => ({
      id: w.id,
      content: w.content,
      author: authorOf(w.user),
      updatedAt: w.updatedAt.toISOString(),
    })),
  };
}

/**
 * Publishes the reader's solution, or replaces the previous one. Only once
 * the challenge is solved; screened like the forum (links allowed: a
 * solution points at the tools it used), what the screen flags written
 * hidden and put in the queue.
 */
export async function publishWriteup(userId: string, input: unknown): Promise<WriteupResult> {
  const limit = await checkQaSubmission(userId);
  if (!limit.success) return { ok: false, error: TOO_FAST };

  const parsed = publishSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const { content } = parsed.data;
  const id = parsed.data.challengeId;

  const challenge = await findActive(id);
  if (challenge === null) return { ok: false, error: NOT_FOUND };
  if (!(await writeupRepository.hasSolved(userId, id))) {
    return { ok: false, error: "Résous le défi avant de publier ta solution." };
  }

  const screen = await moderationRepository.screen({
    text: content,
    surface: MODERATION_SURFACE.challengeWriteup,
    userId,
    allowLinks: true,
  });
  if (screen.throttled) return { ok: false, error: FLAG_BUDGET_MESSAGE };

  const writeup = await writeupRepository.upsert({
    challengeId: id,
    userId,
    content,
    isHidden: screen.flagged,
  });
  if (screen.eventId !== null) {
    await moderationRepository.attachContent(screen.eventId, writeup.id);
  }
  if (screen.flagged) {
    await announceModeration({
      userId,
      surface: MODERATION_SURFACE.challengeWriteup,
      stage: "held",
      excerpt: excerpt(content, 300),
    });
  }
  revalidatePath(`/challenges/${challenge.slug}`);
  return screen.flagged ? { ok: true, heldForReview: true } : { ok: true };
}

/** Removes the reader's own solution. */
export async function deleteWriteup(userId: string, rawId: unknown): Promise<WriteupResult> {
  const id = challengeId.safeParse(rawId);
  if (!id.success) return { ok: false, error: NOT_FOUND };
  const challenge = await findActive(id.data);
  if (challenge === null) return { ok: false, error: NOT_FOUND };
  if ((await writeupRepository.deleteOwn(userId, id.data)) === 0) {
    return { ok: false, error: "Aucune solution à retirer." };
  }
  revalidatePath(`/challenges/${challenge.slug}`);
  return { ok: true };
}
