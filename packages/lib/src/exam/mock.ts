/**
 * Mock exams (examens blancs): a timed draw over a path's lesson quizzes, a
 * few questions from each module, and a score per module, the way a
 * certification reports its domains. Practice only: no certificate, no XP,
 * no waiting period, as many as the learner wants.
 *
 * Pure: the site draws and scores with it (apps/web/lib/exam/mock-exam.ts),
 * the answer key never leaves the server, and the app shows what the site
 * returns. A question is a lesson's quiz, referred to by lesson and quiz id,
 * so an exam scores against the lessons as they are when it is handed in.
 */

export interface MockSource {
  lessonId: string;
  quizId: string;
  /** The module the lesson is filed under: the exam's domain. */
  domain: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string | null;
}

/** One drawn question, as stored on the attempt: where it comes from, and its option order. */
export interface MockRef {
  lessonId: string;
  quizId: string;
  domain: string;
  /** The options in the order shown: `order[k]` is the index of the k-th shown option. */
  order: number[];
}

/** What the learner is shown: no answer key. */
export interface MockQuestion {
  index: number;
  domain: string;
  question: string;
  options: string[];
}

export interface DomainScore {
  domain: string;
  correct: number;
  total: number;
  percent: number;
}

export interface MockReviewItem {
  index: number;
  domain: string;
  question: string;
  options: string[];
  /** The shown option picked, or null when left blank. */
  selected: number | null;
  /** The shown option that was right. */
  correct: number;
  right: boolean;
  explanation: string | null;
}

export interface MockResult {
  score: number;
  correct: number;
  total: number;
  domains: DomainScore[];
  review: MockReviewItem[];
}

/** Questions drawn from each module. */
export const MOCK_PER_DOMAIN = 3;

/** Below this, a path has too few quizzes for an exam worth the name. */
export const MOCK_MIN_QUESTIONS = 6;

/** A minute and a half per question, as certification exams roughly allow. */
export function mockTimeLimitMinutes(questionCount: number): number {
  return Math.max(10, Math.ceil((questionCount * 90) / 60));
}

/** Under a minute, the clock turns red and says so. */
export const MOCK_LAST_MINUTE_MS = 60_000;

/** "07:42": the time left, a second begun counted whole, never below 00:00. */
export function mockClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function sourceKey(lessonId: string, quizId: string): string {
  return `${lessonId}:${quizId}`;
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/** The domains in the order they first appear, with how many questions each has. */
export function domainsOf(sources: readonly MockSource[]): { domain: string; available: number }[] {
  const counts = new Map<string, number>();
  for (const source of sources) counts.set(source.domain, (counts.get(source.domain) ?? 0) + 1);
  return [...counts].map(([domain, available]) => ({ domain, available }));
}

/**
 * Draws up to `perDomain` questions from each domain, domains in the path's
 * order, questions shuffled within a domain and each question's options
 * shuffled.
 */
export function drawMockExam(
  sources: readonly MockSource[],
  perDomain: number = MOCK_PER_DOMAIN,
  rng: () => number = Math.random,
): MockRef[] {
  return domainsOf(sources).flatMap(({ domain }) =>
    shuffled(
      sources.filter((source) => source.domain === domain),
      rng,
    )
      .slice(0, perDomain)
      .map((source) => ({
        lessonId: source.lessonId,
        quizId: source.quizId,
        domain,
        order: shuffled(
          source.options.map((_, k) => k),
          rng,
        ),
      })),
  );
}

/** A ref matched to its quiz as the lesson has it now, or null if it changed shape or went. */
function match(ref: MockRef, sources: ReadonlyMap<string, MockSource>): MockSource | null {
  const source = sources.get(sourceKey(ref.lessonId, ref.quizId));
  if (source?.options.length !== ref.order.length) return null;
  const seen = new Set(ref.order);
  if (
    seen.size !== ref.order.length ||
    ref.order.some((k) => k < 0 || k >= source.options.length)
  ) {
    return null;
  }
  return source;
}

/** The questions to show, options in their drawn order; a question that went is left out. */
export function clientQuestions(
  refs: readonly MockRef[],
  sources: ReadonlyMap<string, MockSource>,
): MockQuestion[] {
  return refs.flatMap((ref, index): MockQuestion[] => {
    const source = match(ref, sources);
    if (source === null) return [];
    return [
      {
        index,
        domain: ref.domain,
        question: source.question,
        options: ref.order.map((k) => source.options[k] ?? ""),
      },
    ];
  });
}

function percentOf(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

/**
 * Scores the answers, keyed by question index, each the shown option picked.
 * A blank counts as wrong; a question whose quiz went from its lesson (or
 * changed its options) is left out of the count rather than held against
 * anybody.
 */
export function scoreMockExam(
  refs: readonly MockRef[],
  sources: ReadonlyMap<string, MockSource>,
  answers: Readonly<Record<string, number>>,
): MockResult {
  const review: MockReviewItem[] = [];
  const byDomain = new Map<string, { correct: number; total: number }>();
  for (const [index, ref] of refs.entries()) {
    const source = match(ref, sources);
    if (source === null) continue;
    const picked = answers[String(index)];
    const selected =
      typeof picked === "number" &&
      Number.isInteger(picked) &&
      picked >= 0 &&
      picked < ref.order.length
        ? picked
        : null;
    const correct = ref.order.indexOf(source.correct);
    const right = selected !== null && selected === correct;
    review.push({
      index,
      domain: ref.domain,
      question: source.question,
      options: ref.order.map((k) => source.options[k] ?? ""),
      selected,
      correct,
      right,
      explanation: source.explanation,
    });
    const tally = byDomain.get(ref.domain) ?? { correct: 0, total: 0 };
    tally.total += 1;
    if (right) tally.correct += 1;
    byDomain.set(ref.domain, tally);
  }
  const domains = [...byDomain].map(([domain, tally]) => ({
    domain,
    correct: tally.correct,
    total: tally.total,
    percent: percentOf(tally.correct, tally.total),
  }));
  const correct = review.filter((item) => item.right).length;
  return {
    score: percentOf(correct, review.length),
    correct,
    total: review.length,
    domains,
    review,
  };
}

/** The word next to a domain's score: what to do about it. */
export function domainVerdict(percent: number): string {
  if (percent >= 80) return "acquis";
  if (percent >= 50) return "à consolider";
  return "à revoir";
}

/** A verdict as a tone, for whatever colours it. */
export type VerdictTone = "ok" | "mid" | "low";

/** A score's tone, read from its verdict so the thresholds stay those of `domainVerdict`. */
export function verdictTone(percent: number): VerdictTone {
  switch (domainVerdict(percent)) {
    case "acquis":
      return "ok";
    case "à consolider":
      return "mid";
    default:
      return "low";
  }
}

/** The domains to go back to first: under 70 %, the weakest first. */
export function weakestDomains(domains: readonly DomainScore[], count = 2): DomainScore[] {
  return [...domains]
    .filter((domain) => domain.percent < 70)
    .sort((a, b) => a.percent - b.percent || b.total - a.total)
    .slice(0, count);
}

/** The line under the score: the modules to go back to first, or that none needs it. */
export function mockAdvice(domains: readonly DomainScore[]): string {
  const weakest = weakestDomains(domains);
  // " et ", not a comma: module titles have commas of their own.
  return weakest.length > 0
    ? `À revoir en premier : ${weakest.map((d) => d.domain).join(" et ")}.`
    : "Tous les modules au-dessus de 70 % : tu es prêt pour l'examen final.";
}

/** The questions of one module, in the order they were drawn. */
export interface MockPart {
  domain: string;
  questions: MockQuestion[];
}

/** The paper cut into its modules: the draw keeps a module's questions together. */
export function mockParts(questions: readonly MockQuestion[]): MockPart[] {
  const parts: MockPart[] = [];
  for (const question of questions) {
    const last = parts.at(-1);
    if (last?.domain === question.domain) last.questions.push(question);
    else parts.push({ domain: question.domain, questions: [question] });
  }
  return parts;
}

/** The questions still blank, answers keyed by question index as they are handed in. */
export function unansweredQuestions(
  questions: readonly MockQuestion[],
  answers: Readonly<Record<string, number>>,
): MockQuestion[] {
  return questions.filter((question) => answers[String(question.index)] === undefined);
}

/** What became of a question once handed in. */
export type MockAnswerState = "right" | "wrong" | "blank";

/** A question's state in the correction: a blank counts as wrong, but is told apart. */
export function answerState(item: Pick<MockReviewItem, "right" | "selected">): MockAnswerState {
  if (item.right) return "right";
  return item.selected === null ? "blank" : "wrong";
}

/** The word the correction gives each state. */
export const ANSWER_WORD: Record<MockAnswerState, string> = {
  right: "Juste",
  wrong: "Fausse",
  blank: "Sans réponse",
};

/** An option's key letter: A, B, C... */
export function optionKey(k: number): string {
  return k < 26 ? String.fromCharCode(65 + k) : String(k + 1);
}

/** What the correction writes beside an option: the right one, the one picked, or both. */
export function optionTag(
  item: Pick<MockReviewItem, "correct" | "selected">,
  k: number,
): string | null {
  const right = k === item.correct;
  const picked = k === item.selected;
  if (right && picked) return "Ta réponse, juste";
  if (right) return "Bonne réponse";
  if (picked) return "Ta réponse";
  return null;
}

/** The copy's answers, counted by what became of them. */
export function answerCounts(review: readonly MockReviewItem[]): Record<MockAnswerState, number> {
  const counts: Record<MockAnswerState, number> = { right: 0, wrong: 0, blank: 0 };
  for (const item of review) counts[answerState(item)] += 1;
  return counts;
}

/**
 * The best score over the attempts listed, from two of them (a single attempt
 * is its own best). Over the list only: the history holds the last few.
 */
export function bestScore(history: readonly { score: number }[]): number | null {
  return history.length > 1 ? Math.max(...history.map((attempt) => attempt.score)) : null;
}

/** Each module's score at the last attempt, by module; the history comes newest first. */
export function lastDomainScores(
  history: readonly { domains: readonly DomainScore[] }[],
): Map<string, DomainScore> {
  return new Map((history[0]?.domains ?? []).map((domain) => [domain.domain, domain]));
}
