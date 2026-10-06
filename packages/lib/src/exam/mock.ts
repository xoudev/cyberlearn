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

/** The domains to go back to first: under 70 %, the weakest first. */
export function weakestDomains(domains: readonly DomainScore[], count = 2): DomainScore[] {
  return [...domains]
    .filter((domain) => domain.percent < 70)
    .sort((a, b) => a.percent - b.percent || b.total - a.total)
    .slice(0, count);
}
