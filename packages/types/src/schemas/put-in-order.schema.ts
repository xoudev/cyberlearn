import { z } from "zod";

/**
 * <PutInOrder>: steps or layers to put back in order. The author writes the
 * items in the right order; the learner sees them shuffled and places them one
 * by one. The site and the app read the same props through parsePutInOrder,
 * and the lesson check refuses an exercise that would not work.
 */

const item = z.string().trim().min(1).max(200);

export const putInOrderSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    /** What the order is: "de la plus basse à la plus haute". */
    task: z.string().trim().min(1).max(600),
    /** The items, written in the right order. */
    items: z.array(item).min(3).max(10),
    /** Why this order, shown once it is found. */
    explanation: z.string().trim().min(1).max(1200).optional(),
    /** Shown after a first wrong check. */
    hint: z.string().trim().min(1).max(300).optional(),
  })
  .strict()
  .superRefine((exercise, ctx) => {
    const repeated = exercise.items.find((text, i) => exercise.items.indexOf(text) !== i);
    if (repeated !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: `items répète « ${repeated} » : deux éléments identiques n'ont pas d'ordre.`,
      });
    }
  });

export type PutInOrder = z.infer<typeof putInOrderSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

/** Reads the props, or says in French what is wrong, for the lesson's author. */
export function parsePutInOrder(raw: unknown): Parsed<PutInOrder> {
  const parsed = putInOrderSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length && issue.code !== "custom" ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}
