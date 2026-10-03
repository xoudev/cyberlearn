import { z } from "zod";

/**
 * <FindTheFlaw>: a short piece of code, one vulnerable line to click, then the
 * name of the flaw to pick among a few. The site and the app read the same
 * props through parseFindTheFlaw, and the lesson check refuses a lesson whose
 * exercise would not work.
 */

export const findTheFlawSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    language: z.string().trim().min(1).max(20).default("code"),
    code: z.string().min(1).max(4000),
    /** The vulnerable line, counted from 1 as the reader sees them. */
    line: z.number().int().min(1),
    options: z.array(z.string().trim().min(1).max(160)).min(2).max(6),
    /** The right option, counted from 0. */
    correct: z.number().int().min(0),
    explanation: z.string().trim().min(1).max(1200),
    /** Shown after a second wrong line. */
    hint: z.string().trim().min(1).max(300).optional(),
  })
  .superRefine((flaw, ctx) => {
    const count = flawLines(flaw.code).length;
    if (flaw.line > count) {
      ctx.addIssue({
        code: "custom",
        path: ["line"],
        message: `line vaut ${String(flaw.line)}, mais le code n'a que ${String(count)} ligne${count > 1 ? "s" : ""}.`,
      });
    } else if ((flawLines(flaw.code)[flaw.line - 1] ?? "").trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["line"],
        message: `la ligne ${String(flaw.line)} est vide : il faut désigner une ligne de code.`,
      });
    }
    if (flaw.correct >= flaw.options.length) {
      ctx.addIssue({
        code: "custom",
        path: ["correct"],
        message: `correct vaut ${String(flaw.correct)}, mais il n'y a que ${String(flaw.options.length)} options (comptées à partir de 0).`,
      });
    }
  });

export type FindTheFlaw = z.infer<typeof findTheFlawSchema>;

export type FindTheFlawResult = { ok: true; flaw: FindTheFlaw } | { ok: false; problem: string };

/**
 * The lines of the code as the reader sees them: a template literal written
 * on its own lines starts and ends with a line break, which is not a line.
 */
export function flawLines(code: string): string[] {
  return code
    .replace(/\r\n/g, "\n")
    .replace(/^\n+|\n+$/g, "")
    .split("\n");
}

/** Reads the props, or says in French what is wrong, for the lesson's author. */
export function parseFindTheFlaw(raw: unknown): FindTheFlawResult {
  const parsed = findTheFlawSchema.safeParse(raw);
  if (parsed.success) return { ok: true, flaw: parsed.data };
  const issue = parsed.error.issues[0];
  // The checks written above already name their prop; zod's own do not.
  const where = issue?.path.length && issue.code !== "custom" ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}
