// Zod validation for the admin quiz CRUD. Plain module (NOT "use server") so the
// schemas can be unit-tested and reused by the server actions.

import { z } from "zod";

export const quizSettingsSchema = z.object({
  passThreshold: z.coerce.number().int().min(0).max(100),
  questionsToDraw: z.coerce.number().int().min(1).max(100),
  isActive: z.boolean(),
});

const optionSchema = z.object({
  id: z.string().trim().min(1).max(10),
  text: z.string().trim().min(1).max(500),
});

export const questionSchema = z
  .object({
    question: z.string().trim().min(1).max(2000),
    options: z
      .array(optionSchema)
      .min(2, "Au moins 2 options")
      .max(10)
      .refine((opts) => new Set(opts.map((o) => o.id)).size === opts.length, {
        message: "Les identifiants d'options doivent être uniques",
      }),
    correctOptionId: z.string().trim().min(1),
    explanation: z.string().trim().max(2000).optional(),
    orderIndex: z.coerce.number().int().min(0).max(1000),
    isActive: z.boolean(),
  })
  // The answer key must point to one of the options, else the question is unscorable.
  .refine((q) => q.options.some((o) => o.id === q.correctOptionId), {
    message: "La bonne réponse doit correspondre à l'une des options",
    path: ["correctOptionId"],
  });

// The ids an action is called with: the path, whose page is revalidated, and
// the quiz or question acted on. They reach Prisma, so they are checked too.
export const quizTargetSchema = z.object({ pathId: z.guid() });
export const newQuestionTargetSchema = z.object({ pathId: z.guid(), quizId: z.guid() });
export const questionTargetSchema = z.object({ pathId: z.guid(), questionId: z.guid() });

export type QuizSettingsInput = z.infer<typeof quizSettingsSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
