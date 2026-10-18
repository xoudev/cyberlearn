import { z } from "zod";

// ─── /api/mobile/review-cards: the day's recall and a module's review ──────
//
// What the route answers, as the app reads it. The site's service writes it
// (RecallView, RecallVerdict and RecallResult of
// apps/web/lib/revisions/daily-recall.ts) and the route's own test parses a
// full reply with these schemas, so the two cannot drift apart unnoticed.
// The app never trusts a reply's shape: a body these refuse is a failed
// load, never a screen drawn from half a reply.

/** A question as the learner is shown it: no answer key. */
export const recallQuestionSchema = z.object({
  /** Its place in the draw, sent back with the answer. */
  index: z.number().int().min(0),
  lessonId: z.string().min(1),
  quizId: z.string().min(1),
  lessonTitle: z.string(),
  question: z.string(),
  /** In the order shown. */
  options: z.array(z.string()),
});

export type RecallQuestion = z.infer<typeof recallQuestionSchema>;

/** "Revoir ce passage": the lesson, on the section the question is in. */
export const recallPassageSchema = z.object({
  lessonTitle: z.string(),
  /** The site's link: /lessons/<slug>?section=<n>#quiz-<id> (@cyberlearn/lib/revisions/passage). */
  href: z.string().min(1),
});

export type RecallPassage = z.infer<typeof recallPassageSchema>;

/** The verdict on one answer, given once it is final. */
export const recallVerdictSchema = z.object({
  index: z.number().int().min(0),
  /** The shown option picked. */
  selected: z.number().int().min(0),
  correct: z.boolean(),
  /** The shown option that was right. */
  correctIndex: z.number().int().min(0),
  explanation: z.string().nullable(),
  passage: recallPassageSchema.nullable(),
});

export type RecallVerdict = z.infer<typeof recallVerdictSchema>;

/** A recall handed in: right answers out of those given, and the XP it earned. */
export const recallResultSchema = z.object({
  correct: z.number().int().min(0),
  total: z.number().int().min(0),
  xp: z.number().int().min(0),
});

export type RecallResult = z.infer<typeof recallResultSchema>;

/** What the recall screen shows; `status` as the site's window reads it. */
export const recallViewSchema = z.object({
  mode: z.enum(["daily", "module"]),
  status: z.enum(["off", "empty", "open", "done", "missing"]),
  /** The day the questions were drawn for, sent back with a module's answers. */
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  title: z.string(),
  module: z
    .object({
      path: z.string().min(1),
      number: z.number().int().min(1),
    })
    .nullable(),
  questions: z.array(recallQuestionSchema),
  verdicts: z.array(recallVerdictSchema),
  result: recallResultSchema.nullable(),
});

export type RecallView = z.infer<typeof recallViewSchema>;

const refusalSchema = z.object({ ok: z.literal(false), error: z.string().min(1) });

/** GET: the day's recall, or a module's review with ?path=&module=. */
export const recallReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), recall: recallViewSchema }),
  refusalSchema,
]);

export type RecallReply = z.infer<typeof recallReplySchema>;

/** POST: one answer, checked on the server; `result` is set once it hands the day's recall in. */
export const recallAnswerReplySchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    verdict: recallVerdictSchema,
    result: recallResultSchema.nullable(),
  }),
  refusalSchema,
]);

export type RecallAnswerReply = z.infer<typeof recallAnswerReplySchema>;
