import { z } from "zod";

/**
 * <PasswordLab>: a table of sample accounts as a platform's database would
 * hold them (a user, an optional salt, the SHA-256 of salt and password) and
 * a dictionary attack to run against it, in the browser, on made-up data. The
 * learner sees which passwords fall (short, common), which resist (long, out
 * of the dictionary), what a salt changes (the same password gives two
 * different hashes, and a table computed in advance stops working) and what a
 * slow function does to the price of each guess. The exercise is done when
 * the weak accounts are found and the closing question is answered.
 *
 * The props never hold a clear password: only the hashes, so the learner has
 * to earn them. The site and the app read the same props through
 * parsePasswordLab, and run the same attack (@cyberlearn/lib/crypto/cracking).
 */

export const PASSWORD_LAB_MAX_ACCOUNTS = 12;

const accountSchema = z
  .object({
    user: z.string().trim().min(1).max(40),
    /** SHA-256 of the salt followed by the password: sixty-four hexadecimal characters. */
    hash: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[0-9a-f]{64}$/u, "une empreinte SHA-256 fait 64 caractères hexadécimaux."),
    /** Absent when the platform did not salt this account. */
    salt: z
      .string()
      .regex(/^[A-Za-z0-9]{1,32}$/u, "le sel s'écrit avec des lettres et des chiffres, 32 au plus.")
      .optional(),
    /** What the debrief says of this account once it has fallen, or been shown to resist. */
    note: z.string().trim().min(1).max(300).optional(),
  })
  .strict();

export type PasswordLabAccount = z.infer<typeof accountSchema>;

export const passwordLabSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    task: z.string().trim().min(1).max(600).optional(),
    /** The stolen table, in the order it is shown. */
    accounts: z.array(accountSchema).min(2).max(PASSWORD_LAB_MAX_ACCOUNTS),
    /** How many of them fall to the full dictionary: the accounts to find. */
    weak: z.number().int().min(1),
    /** The closing question, written like a quiz: not shuffled, the order is the author's. */
    question: z.string().trim().min(1).max(300).optional(),
    options: z.array(z.string().trim().min(1).max(240)).min(2).max(5).optional(),
    correct: z.number().int().min(0).optional(),
    /** Why the right answer is right, shown once it is chosen. */
    explanation: z.string().trim().min(1).max(600).optional(),
  })
  .strict()
  .superRefine((lab, ctx) => {
    const problem = (path: string, message: string): void => {
      ctx.addIssue({ code: "custom", path: [path], message });
    };
    const seen = new Set<string>();
    for (const account of lab.accounts) {
      const key = account.user.toLowerCase();
      if (seen.has(key)) problem("accounts", `deux comptes portent le nom « ${account.user} ».`);
      seen.add(key);
    }
    if (lab.weak > lab.accounts.length) {
      problem(
        "weak",
        `weak vaut ${String(lab.weak)}, mais la table n'a que ${String(lab.accounts.length)} comptes.`,
      );
    }
    const asked = lab.question !== undefined;
    if (asked && (lab.options === undefined || lab.correct === undefined)) {
      problem("question", "une question demande ses options et la bonne (correct).");
    }
    if (!asked && (lab.options !== undefined || lab.correct !== undefined)) {
      problem("question", "options et correct sont ceux d'une question : écris-la (question).");
    }
    if (lab.options !== undefined) {
      if (lab.correct !== undefined && lab.correct >= lab.options.length) {
        problem("correct", "correct est l'indice d'une option (la première vaut 0).");
      }
      if (new Set(lab.options).size !== lab.options.length) {
        problem("options", "deux options sont identiques.");
      }
    }
  });

export type PasswordLab = z.infer<typeof passwordLabSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

/** Reads the props, or says in French what is wrong, for the lesson's author. */
export function parsePasswordLab(raw: unknown): Parsed<PasswordLab> {
  const parsed = passwordLabSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length && issue.code !== "custom" ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}
