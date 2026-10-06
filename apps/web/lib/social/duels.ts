import { z } from "zod";
import {
  duelRepository,
  friendshipRepository,
  notificationRepository,
  pathsVisibleTo,
  prisma,
} from "@cyberlearn/db";
import { sourceKey, type MockRef, type MockSource } from "@cyberlearn/lib/exam/mock";
import { extractLessonQuizzes } from "@cyberlearn/lib/mdx-quizzes";
import {
  checkDuelAnswer,
  DUEL_QUESTIONS,
  DUEL_TTL_MS,
  drawDuel,
  duelQuestions,
  duelWinner,
  isExpired,
  tallyFor,
  type DuelAnswerRow,
  type DuelQuestion,
  type DuelStatus,
} from "@cyberlearn/lib/social/duel";
import { loadSources } from "@/lib/exam/mock-exam";
import { checkNotifyingWrite } from "@/lib/rate-limit";

/**
 * Quiz duels between friends: a challenge sent on a path, accepted or
 * declined, five questions answered by both, each answer checked on the
 * server, the score of the other moving on screen as they go, the duel
 * settled when both are done or when its day is over.
 *
 * Shared by the site (/duels and its actions) and the app
 * (/api/mobile/duels/*). Callers are responsible for AUTHENTICATION:
 * `userId` must be a verified identity.
 */

export interface DuelPlayer {
  id: string;
  name: string;
  username: string | null;
}

export interface DuelScore {
  answered: number;
  correct: number;
}

export interface DuelSummary {
  id: string;
  status: DuelStatus;
  pathTitle: string;
  pathSlug: string;
  reader: DuelPlayer;
  other: DuelPlayer;
  /** The reader sent the challenge. */
  readerIsChallenger: boolean;
  questionCount: number;
  readerScore: DuelScore;
  otherScore: DuelScore;
  /** Once settled: "reader", "other" or "draw". */
  winner: "reader" | "other" | "draw" | null;
  createdAt: string;
  expiresAt: string;
}

export interface DuelAnswerView {
  index: number;
  selected: number;
  correct: boolean;
  /** The shown option that was right, revealed once answered. */
  correctIndex: number | null;
}

export interface DuelView extends DuelSummary {
  /** The questions, once the duel is accepted; empty before. */
  questions: DuelQuestion[];
  readerAnswers: DuelAnswerView[];
}

export type DuelResult = { ok: true } | { ok: false; error: string };
export type DuelCreateResult = { ok: true; id: string } | { ok: false; error: string };
export type DuelAnswerResult =
  | { ok: true; correct: boolean; correctIndex: number }
  | { ok: false; error: string };

const uuid = z.guid();
const createSchema = z.object({ opponentId: uuid, pathId: uuid });
const answerSchema = z.object({
  duelId: uuid,
  index: z.number().int().min(0).max(50),
  selected: z.number().int().min(0).max(25),
});

const NOT_FOUND = "Duel introuvable.";

type DuelRow = NonNullable<Awaited<ReturnType<typeof duelRepository.findById>>>;

function playerOf(user: { id: string; displayName: string; username: string | null }): DuelPlayer {
  return {
    id: user.id,
    name: user.displayName || (user.username ?? "Sans nom"),
    username: user.username,
  };
}

/** The refs stored on a duel, read back defensively: our own JSON. */
function readRefs(value: unknown): MockRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): MockRef[] => {
    if (typeof item !== "object" || item === null) return [];
    // SAFETY: written by createDuel from MockRef objects; each field is checked below.
    const ref = item as Partial<Record<keyof MockRef, unknown>>;
    if (
      typeof ref.lessonId !== "string" ||
      typeof ref.quizId !== "string" ||
      typeof ref.domain !== "string" ||
      !Array.isArray(ref.order) ||
      !ref.order.every((k): k is number => typeof k === "number")
    ) {
      return [];
    }
    return [{ lessonId: ref.lessonId, quizId: ref.quizId, domain: ref.domain, order: ref.order }];
  });
}

/** The quizzes of the lessons a duel drew from, as they are now. */
async function sourcesFor(refs: readonly MockRef[]): Promise<Map<string, MockSource>> {
  const ids = [...new Set(refs.map((ref) => ref.lessonId))];
  if (ids.length === 0) return new Map();
  const lessons = await prisma.lesson.findMany({
    where: { id: { in: ids } },
    select: { id: true, contentMdx: true },
  });
  const map = new Map<string, MockSource>();
  for (const lesson of lessons) {
    for (const quiz of extractLessonQuizzes(lesson.contentMdx)) {
      map.set(sourceKey(lesson.id, quiz.id), {
        lessonId: lesson.id,
        quizId: quiz.id,
        domain: "",
        question: quiz.question,
        options: quiz.options,
        correct: quiz.correct,
        explanation: quiz.explanation,
      });
    }
  }
  return map;
}

function toRows(
  answers: readonly { userId: string; index: number; correct: boolean; answeredAt: Date }[],
): DuelAnswerRow[] {
  return answers.map((a) => ({
    userId: a.userId,
    index: a.index,
    correct: a.correct,
    answeredAt: a.answeredAt,
  }));
}

async function notifyResult(
  duel: DuelRow,
  winnerId: string | null,
  rows: DuelAnswerRow[],
): Promise<void> {
  const count = readRefs(duel.questions).length;
  const a = tallyFor(duel.challengerId, rows, count);
  const b = tallyFor(duel.opponentId, rows, count);
  const challenger = playerOf(duel.challenger);
  const opponent = playerOf(duel.opponent);
  const score = `${String(a.correct)} à ${String(b.correct)}`;
  for (const [reader, other] of [
    [challenger, opponent],
    [opponent, challenger],
  ] as const) {
    const verdict = winnerId === null ? "égalité" : winnerId === reader.id ? "victoire" : "défaite";
    await notificationRepository.create({
      userId: reader.id,
      type: "DUEL_RESULT",
      title: "Duel terminé",
      body: `Duel contre ${other.name} sur « ${duel.path.title} » : ${score}, ${verdict}.`,
      actionUrl: `/duels/${duel.id}`,
    });
  }
}

/**
 * Settles a duel whose time is over, or that both have finished: a pending
 * one lapses, an active one ends with the answers given. Returns the duel as
 * it now stands.
 */
async function settle(duel: DuelRow, now: Date = new Date()): Promise<DuelRow> {
  const count = readRefs(duel.questions).length;
  if (duel.status === "PENDING" && isExpired(duel, now)) {
    await duelRepository.transition(duel.id, "PENDING", { status: "EXPIRED" });
    return { ...duel, status: "EXPIRED" };
  }
  if (duel.status !== "ACTIVE") return duel;
  const rows = toRows(await duelRepository.listAnswers(duel.id));
  const a = tallyFor(duel.challengerId, rows, count);
  const b = tallyFor(duel.opponentId, rows, count);
  const bothDone = a.answered >= count && b.answered >= count;
  if (!bothDone && !isExpired(duel, now)) return duel;
  const winner = duelWinner(a, b);
  const winnerId =
    winner === "draw" ? null : winner === "challenger" ? duel.challengerId : duel.opponentId;
  const settled = await duelRepository.transition(duel.id, "ACTIVE", {
    status: "FINISHED",
    finishedAt: now,
    winnerId,
  });
  if (settled) await notifyResult(duel, winnerId, rows);
  return { ...duel, status: "FINISHED", finishedAt: now, winnerId };
}

function summaryOf(duel: DuelRow, readerId: string, rows: DuelAnswerRow[]): DuelSummary {
  const readerIsChallenger = duel.challengerId === readerId;
  const reader = playerOf(readerIsChallenger ? duel.challenger : duel.opponent);
  const other = playerOf(readerIsChallenger ? duel.opponent : duel.challenger);
  const count = readRefs(duel.questions).length;
  const mine = tallyFor(reader.id, rows, count);
  const theirs = tallyFor(other.id, rows, count);
  return {
    id: duel.id,
    status: duel.status,
    pathTitle: duel.path.title,
    pathSlug: duel.path.slug,
    reader,
    other,
    readerIsChallenger,
    questionCount: count,
    readerScore: { answered: mine.answered, correct: mine.correct },
    otherScore: { answered: theirs.answered, correct: theirs.correct },
    winner:
      duel.status !== "FINISHED"
        ? null
        : duel.winnerId === null
          ? "draw"
          : duel.winnerId === readerId
            ? "reader"
            : "other",
    createdAt: duel.createdAt.toISOString(),
    expiresAt: duel.expiresAt.toISOString(),
  };
}

function isPlayer(duel: { challengerId: string; opponentId: string }, userId: string): boolean {
  return duel.challengerId === userId || duel.opponentId === userId;
}

/** Whom the reader may challenge, and on which paths: what the new duel form offers. */
export async function duelSetupFor(userId: string): Promise<{
  friends: { id: string; name: string }[];
  paths: { id: string; title: string }[];
}> {
  const [edges, paths] = await Promise.all([
    friendshipRepository.listFriends(userId),
    prisma.path.findMany({
      where: pathsVisibleTo(userId),
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);
  return {
    friends: edges
      .filter((edge) => edge.status === "ACCEPTED")
      .map((edge) => ({ id: edge.person.id, name: playerOf(edge.person).name })),
    paths,
  };
}

/** The reader's duels, the most recent first, each settled if its time is over. */
export async function listDuelsFor(userId: string): Promise<DuelSummary[]> {
  const duels = await duelRepository.listFor(userId);
  const out: DuelSummary[] = [];
  for (const raw of duels) {
    const duel = await settle(raw);
    const rows = duel.status === "PENDING" ? [] : toRows(await duelRepository.listAnswers(duel.id));
    out.push(summaryOf(duel, userId, rows));
  }
  return out;
}

/** Challenges a friend on a path: five questions drawn from its lessons. */
export async function createDuel(userId: string, input: unknown): Promise<DuelCreateResult> {
  const limit = await checkNotifyingWrite(userId);
  if (!limit.success) return { ok: false, error: "Trop de défis d'un coup. Réessaie plus tard." };
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choisis un ami et un parcours." };
  const { opponentId, pathId } = parsed.data;
  if (opponentId === userId) return { ok: false, error: "On ne se défie pas soi-même." };

  const friendship = await friendshipRepository.between(userId, opponentId);
  if (friendship?.status !== "ACCEPTED") {
    return { ok: false, error: "Tu ne peux défier que tes amis." };
  }
  // A path both of them may open: a class's path stays its class's.
  const [mine, theirs] = await Promise.all([
    prisma.path.findFirst({
      where: { id: pathId, ...pathsVisibleTo(userId) },
      select: { id: true },
    }),
    prisma.path.findFirst({
      where: { id: pathId, ...pathsVisibleTo(opponentId) },
      select: { id: true },
    }),
  ]);
  if (mine === null || theirs === null) {
    return { ok: false, error: "Ce parcours n'est pas ouvert à vous deux." };
  }
  if ((await duelRepository.findOpenBetween(userId, opponentId)) !== null) {
    return { ok: false, error: "Un duel est déjà en cours entre vous deux." };
  }

  const refs = drawDuel(await loadSources(pathId), DUEL_QUESTIONS);
  if (refs.length < DUEL_QUESTIONS) {
    return { ok: false, error: "Ce parcours n'a pas encore assez de questions pour un duel." };
  }
  const duel = await duelRepository.create({
    challengerId: userId,
    opponentId,
    pathId,
    // SAFETY: MockRef is plain data (strings and a number array), valid JSON.
    questions: refs as unknown as object[],
    expiresAt: new Date(Date.now() + DUEL_TTL_MS),
  });
  const challenger = playerOf(duel.challenger);
  await notificationRepository.create({
    userId: opponentId,
    type: "DUEL_INVITE",
    title: "Défi en duel",
    body: `${challenger.name} te défie sur « ${duel.path.title} » : cinq questions, le meilleur score gagne.`,
    actionUrl: `/duels/${duel.id}`,
  });
  return { ok: true, id: duel.id };
}

/** The challenged friend accepts the duel, or declines it. */
export async function respondToDuel(
  userId: string,
  rawId: unknown,
  accept: unknown,
): Promise<DuelResult> {
  const id = uuid.safeParse(rawId);
  const answer = z.boolean().safeParse(accept);
  if (!id.success || !answer.success) return { ok: false, error: NOT_FOUND };
  const found = await duelRepository.findById(id.data);
  if (found?.opponentId !== userId) return { ok: false, error: NOT_FOUND };
  const duel = await settle(found);
  if (duel.status !== "PENDING") return { ok: false, error: "Ce duel n'attend plus de réponse." };

  if (!answer.data) {
    await duelRepository.transition(duel.id, "PENDING", { status: "DECLINED" });
    return { ok: true };
  }
  const now = new Date();
  const moved = await duelRepository.transition(duel.id, "PENDING", {
    status: "ACTIVE",
    acceptedAt: now,
    expiresAt: new Date(now.getTime() + DUEL_TTL_MS),
  });
  if (!moved) return { ok: false, error: "Ce duel n'attend plus de réponse." };
  await notificationRepository.create({
    userId: duel.challengerId,
    type: "DUEL_INVITE",
    title: "Duel accepté",
    body: `${playerOf(duel.opponent).name} a accepté ton duel sur « ${duel.path.title} » : à toi de jouer.`,
    actionUrl: `/duels/${duel.id}`,
  });
  return { ok: true };
}

/** A duel as one of its players sees it: the questions once accepted, their answers, both scores. */
export async function duelViewFor(userId: string, rawId: unknown): Promise<DuelView | null> {
  const id = uuid.safeParse(rawId);
  if (!id.success) return null;
  const found = await duelRepository.findById(id.data);
  if (found === null || !isPlayer(found, userId)) return null;
  const duel = await settle(found);
  const refs = readRefs(duel.questions);
  const playing = duel.status === "ACTIVE" || duel.status === "FINISHED";
  const answers = playing ? await duelRepository.listAnswers(duel.id) : [];
  const sources = playing ? await sourcesFor(refs) : new Map<string, MockSource>();
  const readerAnswers = answers
    .filter((a) => a.userId === userId)
    .map((a): DuelAnswerView => {
      const ref = refs[a.index];
      const checked = ref === undefined ? null : checkDuelAnswer(ref, sources, a.selected);
      return {
        index: a.index,
        selected: a.selected,
        correct: a.correct,
        correctIndex: checked?.correctIndex ?? null,
      };
    });
  return {
    ...summaryOf(duel, userId, toRows(answers)),
    questions: playing ? duelQuestions(refs, sources) : [],
    readerAnswers,
  };
}

/** One answer, checked on the server and final; the duel settles when both are done. */
export async function answerDuel(userId: string, input: unknown): Promise<DuelAnswerResult> {
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Réponse invalide." };
  const { duelId, index, selected } = parsed.data;
  const found = await duelRepository.findById(duelId);
  if (found === null || !isPlayer(found, userId)) return { ok: false, error: NOT_FOUND };
  const duel = await settle(found);
  if (duel.status !== "ACTIVE") return { ok: false, error: "Ce duel n'est plus en cours." };

  const refs = readRefs(duel.questions);
  const ref = refs[index];
  if (ref === undefined) return { ok: false, error: "Réponse invalide." };
  const checked = checkDuelAnswer(ref, await sourcesFor([ref]), selected);
  if (checked === null) return { ok: false, error: "Cette question n'est plus disponible." };
  const recorded = await duelRepository.recordAnswer({
    duelId,
    userId,
    index,
    selected,
    correct: checked.correct,
  });
  if (!recorded) return { ok: false, error: "Tu as déjà répondu à cette question." };
  await settle(duel);
  return { ok: true, correct: checked.correct, correctIndex: checked.correctIndex };
}
