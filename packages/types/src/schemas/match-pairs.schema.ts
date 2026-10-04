import { z } from "zod";

/**
 * <MatchPairs>: two columns to pair up, a port with its service, a protocol
 * with its layer. The author writes the pairs; the learner sees the right-hand
 * side shuffled and fills each row. The site and the app read the same props
 * through parseMatchPairs, and the lesson check refuses an exercise that would
 * not work.
 */

const side = z.string().trim().min(1).max(200);

export const matchPairsSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    /** What goes with what: "chaque port au service qui écoute dessus". */
    task: z.string().trim().min(1).max(600),
    pairs: z
      .array(z.object({ left: side, right: side }).strict())
      .min(3)
      .max(8),
    /** Why these pairs, shown once they are all found. */
    explanation: z.string().trim().min(1).max(1200).optional(),
    /** Shown after a first wrong check. */
    hint: z.string().trim().min(1).max(300).optional(),
  })
  .strict()
  .superRefine((exercise, ctx) => {
    for (const column of ["left", "right"] as const) {
      const texts = exercise.pairs.map((pair) => pair[column]);
      const repeated = texts.find((text, i) => texts.indexOf(text) !== i);
      if (repeated !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["pairs"],
          message: `pairs répète « ${repeated} » à ${column === "left" ? "gauche" : "droite"} : chaque élément d'une colonne s'écrit une fois, sinon l'association est ambiguë.`,
        });
      }
    }
  });

export type MatchPairs = z.infer<typeof matchPairsSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

/** Reads the props, or says in French what is wrong, for the lesson's author. */
export function parseMatchPairs(raw: unknown): Parsed<MatchPairs> {
  const parsed = matchPairsSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length && issue.code !== "custom" ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}
