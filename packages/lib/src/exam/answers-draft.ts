/**
 * The answers of an exam copy that is not handed in yet, kept on the reader's
 * own device while the copy is open.
 *
 * Until the hand-in, the answers lived in the screen's state alone. A network
 * that dropped at the hand-in, or a page the reader reloaded because it had
 * stopped answering, took all of them: the attempt resumed with the time left
 * and every answer gone, on the exam that delivers the certificate. They are
 * kept here as they are given, handed back when the same attempt resumes, and
 * dropped once the copy is in.
 *
 * Shared by the site (the browser's localStorage) and the app (AsyncStorage):
 * the rules are here, the storage is passed in. A storage that fails, or has
 * been cleared, never fails the exam: the answers are then in the screen's
 * state only, as they were.
 */

/** Which exam a copy belongs to: the final exam of a path, or a mock exam. */
export type DraftKind = "exam" | "mock";

/** An answer: the option's id (final exam) or its position (mock exam). */
export type DraftAnswer = string | number;

/** Answers by question: the final exam's question id, or the mock exam's question index. */
export type DraftAnswers = Record<string, DraftAnswer>;

/** A key-value storage, as the browser's localStorage and the app's AsyncStorage both are. */
export interface DraftStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  /** Every key held, to find the drafts of attempts nobody finished. */
  keys: () => Promise<readonly string[]>;
}

/** What every draft's key starts with. */
export const DRAFT_KEY_PREFIX = "cl:exam-draft:";

/**
 * How long a draft is kept. An attempt lasts half an hour (a mock exam a
 * little more), so a draft older than this belongs to a copy nobody will take
 * up again: it is dropped the next time one is written.
 */
export const DRAFT_MAX_AGE_MS = 6 * 60 * 60 * 1000;

/** The most answers one draft holds: a copy has far fewer questions. */
const MAX_ANSWERS = 200;
const MAX_TEXT = 200;

interface StoredDraft {
  v: 1;
  savedAt: number;
  answers: DraftAnswers;
}

/** The key a copy's draft is kept under: the attempt is the copy. */
export function draftKey(kind: DraftKind, attemptId: string): string {
  return `${DRAFT_KEY_PREFIX}${kind}:${attemptId}`;
}

/** The draft as it is written. */
export function serializeDraft(answers: Readonly<DraftAnswers>, nowMs: number): string {
  const stored: StoredDraft = { v: 1, savedAt: nowMs, answers: { ...answers } };
  return JSON.stringify(stored);
}

function isAnswer(value: unknown): value is DraftAnswer {
  if (typeof value === "string") return value.length <= MAX_TEXT;
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** Whether a draft written at `savedAt` is too old (or from the future) to be trusted. */
function isStaleAt(savedAt: number, nowMs: number): boolean {
  return Math.abs(nowMs - savedAt) > DRAFT_MAX_AGE_MS;
}

/** What a stored string holds, or null when it is not a draft of this format. */
function readStored(raw: string | null): StoredDraft | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  // SAFETY: a parsed JSON object, read field by field below; nothing is
  // trusted until each field has been checked.
  const candidate = parsed as { v?: unknown; savedAt?: unknown; answers?: unknown };
  if (candidate.v !== 1 || typeof candidate.savedAt !== "number") return null;
  if (typeof candidate.answers !== "object" || candidate.answers === null) return null;
  const answers: DraftAnswers = {};
  let kept = 0;
  // SAFETY: the answers of a parsed JSON object, each value checked by isAnswer.
  for (const [question, answer] of Object.entries(candidate.answers as Record<string, unknown>)) {
    if (kept >= MAX_ANSWERS) break;
    if (!isAnswer(answer)) continue;
    answers[question] = answer;
    kept += 1;
  }
  return { v: 1, savedAt: candidate.savedAt, answers };
}

/** The answers a stored string holds: none when it is absent, damaged or too old. */
export function parseDraft(raw: string | null, nowMs: number): DraftAnswers {
  const stored = readStored(raw);
  if (stored === null || isStaleAt(stored.savedAt, nowMs)) return {};
  return stored.answers;
}

/**
 * Keeps, of a draft, the answers the final exam's copy can take: a question
 * of the copy, and one of its options. The server refuses a copy with one
 * answer it does not know ("Réponses invalides."), so a stale or damaged
 * entry must never reach the hand-in.
 */
export function restoreExamAnswers(
  saved: Readonly<DraftAnswers>,
  questions: readonly { id: string; options: readonly { id: string }[] }[],
): Record<string, string> {
  const restored: Record<string, string> = {};
  for (const question of questions) {
    const answer = saved[question.id];
    if (typeof answer === "string" && question.options.some((option) => option.id === answer)) {
      restored[question.id] = answer;
    }
  }
  return restored;
}

/**
 * The same for a mock exam's copy: a question of the copy, by its index, and
 * the position of one of its options.
 */
export function restoreMockAnswers(
  saved: Readonly<DraftAnswers>,
  questions: readonly { index: number; options: readonly unknown[] }[],
): Record<string, number> {
  const restored: Record<string, number> = {};
  for (const question of questions) {
    const answer = saved[String(question.index)];
    if (typeof answer === "number" && answer < question.options.length) {
      restored[String(question.index)] = answer;
    }
  }
  return restored;
}

/** The answers kept for this attempt: none if the storage has none, or fails. */
export async function loadDraft(
  storage: DraftStorage,
  kind: DraftKind,
  attemptId: string,
  nowMs: number = Date.now(),
): Promise<DraftAnswers> {
  try {
    return parseDraft(await storage.getItem(draftKey(kind, attemptId)), nowMs);
  } catch {
    return {};
  }
}

/**
 * Keeps the answers given so far, and drops the drafts of attempts too old to
 * be taken up again. Never throws: a full or unavailable storage only means
 * the answers are not kept.
 */
export async function saveDraft(
  storage: DraftStorage,
  kind: DraftKind,
  attemptId: string,
  answers: Readonly<DraftAnswers>,
  nowMs: number = Date.now(),
): Promise<void> {
  try {
    await storage.setItem(draftKey(kind, attemptId), serializeDraft(answers, nowMs));
  } catch {
    return;
  }
  try {
    const current = draftKey(kind, attemptId);
    for (const key of await storage.keys()) {
      if (!key.startsWith(DRAFT_KEY_PREFIX) || key === current) continue;
      const stored = readStored(await storage.getItem(key));
      if (stored === null || isStaleAt(stored.savedAt, nowMs)) await storage.removeItem(key);
    }
  } catch {
    // The tidying is a courtesy: the answers are kept, which is what counts.
  }
}

/** Drops the draft of a copy that is in. Never throws. */
export async function clearDraft(
  storage: DraftStorage,
  kind: DraftKind,
  attemptId: string,
): Promise<void> {
  try {
    await storage.removeItem(draftKey(kind, attemptId));
  } catch {
    // Nothing to clear if the storage is not there.
  }
}
