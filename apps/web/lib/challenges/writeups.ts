import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  MODERATION_SURFACE,
  friendshipRepository,
  moderationRepository,
  prisma,
  userRepository,
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
  /**
   * The handle to link to: set only when the reader would be let into that
   * profile (userRepository.profilesOpenTo). A link that lands on a 404 is
   * worse than a name that is not a link, so a closed profile has none.
   */
  username: string | null;
  /** One of the reader's friends: a write-up is always signed, so the mark hides nothing. */
  isFriend: boolean;
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
  /** Out of the others' sight: held for review, or hidden by a moderator. */
  isHidden: boolean;
  /**
   * Hidden by a moderator rather than held by the screen: nobody else sees
   * it, and publishing again does not bring it back. Its author can still
   * remove it.
   */
  hiddenByModeration: boolean;
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

const TOO_FAST = "Trop de messages. Réessaie dans une minute.";
const NOT_FOUND = "Défi introuvable.";
const HIDDEN_BY_MODERATION =
  "Ta solution a été masquée par la modération : tu ne peux pas la republier. Tu peux la retirer.";

async function findActive(id: string): Promise<{ slug: string } | null> {
  return prisma.challenge.findFirst({ where: { id, isActive: true }, select: { slug: true } });
}

function authorOf(
  user: { id: string; displayName: string; username: string | null } | null,
  friends: ReadonlySet<string>,
  openProfiles: ReadonlySet<string>,
): WriteupAuthor | null {
  if (user === null) return null;
  return {
    name: user.displayName || (user.username ?? "Sans nom"),
    username: openProfiles.has(user.id) ? user.username : null,
    isFriend: friends.has(user.id),
  };
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
  const [own, others, friends] = await Promise.all([
    writeupRepository.findOwn(userId, id.data),
    writeupRepository.listOthers(id.data, userId),
    friendshipRepository.friendIds(userId),
  ]);
  // Whose name may be a link: a private profile answers a stranger with a 404.
  const openProfiles = await userRepository.profilesOpenTo(
    userId,
    others.flatMap((w) => (w.user === null ? [] : [w.user.id])),
  );
  return {
    solved: true,
    count,
    own:
      own === null
        ? null
        : {
            content: own.content,
            isHidden: own.isHidden,
            hiddenByModeration: own.hiddenByModeration,
            updatedAt: own.updatedAt.toISOString(),
          },
    others: others.map((w) => ({
      id: w.id,
      content: w.content,
      author: authorOf(w.user, friends, openProfiles),
      updatedAt: w.updatedAt.toISOString(),
    })),
  };
}

/**
 * Publishes the reader's solution, or replaces the previous one. Only once
 * the challenge is solved; screened like the forum (links allowed: a
 * solution points at the tools it used), what the screen flags written
 * hidden and put in the queue. A solution a moderator hid is never written
 * over: publishing again would put it back in front of everybody.
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
  // Refused before the screen, so it records nothing about a text that will
  // not be written. The repository checks again, in the update itself.
  const own = await writeupRepository.findOwn(userId, id);
  if (own?.hiddenByModeration === true) return { ok: false, error: HIDDEN_BY_MODERATION };

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
  // A moderator hid it between the check above and the write.
  if (writeup === null) return { ok: false, error: HIDDEN_BY_MODERATION };
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
