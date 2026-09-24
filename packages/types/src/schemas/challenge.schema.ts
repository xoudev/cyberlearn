import { z } from "zod";

/**
 * The `tests` of a <PythonChallenge>, as an author writes them in MDX.
 *
 * An MDX attribute expression is code nobody type-checks. The component's
 * TypeScript said `expected: string`, the editor let anything through, and on
 * 22 September a lesson was saved with a dictionary there: React was handed an
 * object to render as text and the whole lesson page fell over for everyone
 * who opened it (Sentry JAVASCRIPT-NEXTJS-15).
 *
 * The worker runs `str(<input>)` in Python and compares the result with
 * `expected` using `===`, so `expected` has to be exactly what Python prints.
 * That settles what each JavaScript value an author might write turns into:
 *
 *   "1"    → "1"       already Python's output, kept
 *   1      → "1"       what they meant
 *   true   → "True"    Python spells it with a capital
 *   null   → "None"
 *   {...}  → refused   and said so
 *
 * An object is refused rather than guessed at. Python prints a dict with
 * single quotes and its own spacing, so any conversion would produce a test
 * that looks right and can never pass - a failure that blames the student.
 * Refusing tells the author, in the lesson, exactly what to write instead.
 */

/** Python's `str()` of a JSON scalar. */
function pythonStr(value: string | number | boolean | null): string {
  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  return String(value);
}

const scalar = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);

const testCaseSchema = z.object({
  input: scalar.transform(pythonStr),
  expected: scalar.transform(pythonStr),
  label: z.string().optional(),
});

export const challengeTestsSchema = z.array(testCaseSchema).min(1);

export type ChallengeTestCase = z.infer<typeof challengeTestsSchema>[number];

export type ChallengeTestsResult =
  | { ok: true; tests: ChallengeTestCase[] }
  | { ok: false; problem: string };

/**
 * Reads the `tests` prop, or says in French what is wrong with it.
 *
 * The message is for the lesson's author, who is the only person who can fix
 * it: it names the test and the field, and for the common mistake - a
 * dictionary written as a JavaScript object - it shows the string to write.
 */
export function parseChallengeTests(raw: unknown): ChallengeTestsResult {
  const parsed = challengeTestsSchema.safeParse(raw);
  if (parsed.success) return { ok: true, tests: parsed.data };

  if (!Array.isArray(raw) || raw.length === 0) {
    return {
      ok: false,
      problem: "Ce défi n'a aucun test : la propriété tests est vide ou absente.",
    };
  }

  const issue = parsed.error.issues[0];
  const index = typeof issue?.path[0] === "number" ? issue.path[0] : null;
  const field = typeof issue?.path[1] === "string" ? issue.path[1] : null;
  const where = index !== null ? `Test ${String(index + 1)}` : "Un test";

  if (field === "expected" || field === "input") {
    return {
      ok: false,
      problem:
        `${where} : « ${field} » doit être du texte, tel que Python l'affiche. ` +
        "Pour un dictionnaire, écris-le entre guillemets : " +
        `expected: "{'titre': 'Acheter du pain', 'fait': False}".`,
    };
  }
  return { ok: false, problem: `${where} : chaque test doit avoir un input et un expected.` };
}
