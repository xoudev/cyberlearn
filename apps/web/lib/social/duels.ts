import { z } from "zod";
import {
  duelRepository,
  friendshipRepository,
  notificationRepository,
  pathsVisibleTo,
  prisma,
  userRepository,
} from "@cyberlearn/db";
import type { MockRef, MockSource } from "@cyberlearn/lib/exam/mock";
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
  type DuelRecordCounts,
  type DuelStatus,
} from "@cyberlearn/lib/social/duel";
import { computeLevel } from "@cyberlearn/lib/xp";
import { resolveAvatarSrcMany } from "@/lib/avatar/storage";
import { loadSources } from "@/lib/exam/mock-exam";
import { sourcesFor } from "@/lib/exam/quiz-sources";
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
  /**
   * Ready for an `<img src>`, a glyph marker, or null: signed here, as an
   * uploaded picture needs the service_role key, which never leaves the server.
   */
  avatarSrc: string | null;
  /**
   * Their profile, when the reader would be let into it (profilesOpenTo):
   * a private profile of somebody who is no longer a friend is a name, not a
   * link to a 404. Null on the reader's own side, which the card does not link.
   */
  profileHref: string | null;
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
    avatarSrc: null,
    profileHref: null,
  };
}

/** A player's picture and the link to their profile, as the reader may see them. */
interface PlayerFace {
  avatarSrc: string | null;
  profileHref: string | null;
}

/**
 * The faces of everyone on the duels read, in two calls whatever their
 * number: every avatar signed at once, every profile checked at once. The
 * link is offered only for somebody else whose profile would open for the
 * reader.
 */
async function facesFor(
  readerId: string,
  duels: readonly DuelRow[],
): Promise<Map<string, PlayerFace>> {
  const people = new Map<string, DuelRow["challenger"]>();
  for (const duel of duels) {
    people.set(duel.challenger.id, duel.challenger);
    people.set(duel.opponent.id, duel.opponent);
  }
  const list = [...people.values()];
  const [avatars, open] = await Promise.all([
    resolveAvatarSrcMany(list.map((person) => person.avatarUrl)),
    userRepository.profilesOpenTo(
      readerId,
      list.filter((person) => person.id !== readerId).map((person) => person.id),
    ),
  ]);
  return new Map(
    list.map((person, i) => [
      person.id,
      {
        avatarSrc: avatars[i] ?? null,
        profileHref:
          person.id !== readerId && person.username !== null && open.has(person.id)
            ? `/u/${person.username}`
            : null,
      },
    ]),
  );
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

function summaryOf(
  duel: DuelRow,
  readerId: string,
  rows: DuelAnswerRow[],
  faces: ReadonlyMap<string, PlayerFace> = new Map(),
): DuelSummary {
  const readerIsChallenger = duel.challengerId === readerId;
  const face = (user: DuelRow["challenger"]): DuelPlayer => ({
    ...playerOf(user),
    ...faces.get(user.id),
  });
  const reader = face(readerIsChallenger ? duel.challenger : duel.opponent);
  const other = face(readerIsChallenger ? duel.opponent : duel.challenger);
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

/** A friend the reader may challenge, as the "Défier" window and the app's screen show them. */
export interface DuelFriend {
  id: string;
  name: string;
  username: string | null;
  /**
   * Ready for an `<img src>`, a glyph marker, or null. Resolved here: an
   * uploaded picture is signed with the service_role key, which never
   * leaves the server.
   */
  avatarSrc: string | null;
  level: number;
  /** A duel still open between the two: they cannot be challenged again until it is over. */
  openDuelId: string | null;
}

export interface DuelSetup {
  friends: DuelFriend[];
  paths: { id: string; title: string }[];
}

/**
 * Whom the reader may challenge, and on which paths: what the "Défier" window
 * offers (and the app's duels screen). A friend already in a duel with the
 * reader comes with that duel, settled first so that one whose time is over
 * no longer counts.
 */
export async function duelSetupFor(userId: string): Promise<DuelSetup> {
  const [edges, paths, open] = await Promise.all([
    friendshipRepository.listFriends(userId),
    prisma.path.findMany({
      where: pathsVisibleTo(userId),
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    duelRepository.listOpenFor(userId),
  ]);
  const friends = edges.filter((edge) => edge.status === "ACCEPTED");
  const avatars = await resolveAvatarSrcMany(friends.map((edge) => edge.person.avatarUrl));

  const openWith = new Map<string, string>();
  for (const raw of open) {
    const duel = await settle(raw);
    if (duel.status !== "PENDING" && duel.status !== "ACTIVE") continue;
    const other = duel.challengerId === userId ? duel.opponentId : duel.challengerId;
    if (!openWith.has(other)) openWith.set(other, duel.id);
  }

  return {
    friends: friends.map((edge, i) => ({
      id: edge.person.id,
      name: playerOf(edge.person).name,
      username: edge.person.username,
      avatarSrc: avatars[i] ?? null,
      level: computeLevel(edge.person.xpTotal).level,
      openDuelId: openWith.get(edge.person.id) ?? null,
    })),
    paths,
  };
}

/** The reader's duels, the most recent first, each settled if its time is over. */
export async function listDuelsFor(userId: string): Promise<DuelSummary[]> {
  const duels = await duelRepository.listFor(userId);
  const faces = await facesFor(userId, duels);
  const out: DuelSummary[] = [];
  for (const raw of duels) {
    const duel = await settle(raw);
    const rows = duel.status === "PENDING" ? [] : toRows(await duelRepository.listAnswers(duel.id));
    out.push(summaryOf(duel, userId, rows, faces));
  }
  return out;
}

/**
 * The reader's record over every duel they played, not only the twenty the
 * list shows: each of their duels whose time is over is settled first (a duel
 * nobody opened again is still PENDING or ACTIVE in the table, and settles
 * only when read), then the record is counted in the database.
 */
export async function duelRecordFor(
  userId: string,
  now: Date = new Date(),
): Promise<DuelRecordCounts> {
  for (const raw of await duelRepository.listOverdueFor(userId, now)) await settle(raw, now);
  return duelRepository.recordFor(userId, now);
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
  const [sources, faces] = await Promise.all([
    playing ? sourcesFor(refs) : Promise.resolve(new Map<string, MockSource>()),
    facesFor(userId, [duel]),
  ]);
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
    ...summaryOf(duel, userId, toRows(answers), faces),
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
