import { z } from "zod";

/**
 * The SQL exercises of the lessons, played on a real SQLite (sql.js, in a Web
 * Worker on the site):
 *
 * - <SqlPlayground>: a database built by `schema`, an editor, the results;
 *   with `expected`, the learner's last result is checked against it.
 * - <SqlInjectionLab>: a login form whose server code builds its query by
 *   pasting the fields into `query`, on that same kind of database. The
 *   learner gets in without the password, then sees the parameterised
 *   version of the same query refuse the same input.
 *
 * The site, the app (which shows them as cards) and the lesson check read the
 * props through these schemas.
 */

const cell = z.union([z.string(), z.number(), z.null()]);

const expectedSchema = z
  .object({
    /** Column names, in order; checked when given. */
    columns: z.array(z.string()).min(1).optional(),
    rows: z.array(z.array(cell)).max(200),
    /** False: the rows may come in any order (no ORDER BY asked). */
    ordered: z.boolean().default(false),
  })
  .strict();

export const sqlPlaygroundSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120).optional(),
  /** SQL run on a fresh database before the learner's first query: tables and rows. */
  schema: z.string().min(1).max(20_000),
  starterQuery: z.string().max(2000).optional(),
  /** What to do, above the editor. */
  task: z.string().trim().min(1).max(600).optional(),
  expected: expectedSchema.optional(),
  hint: z.string().trim().min(1).max(400).optional(),
});

export type SqlPlayground = z.infer<typeof sqlPlaygroundSchema>;
export type SqlExpected = z.infer<typeof expectedSchema>;

const fieldSchema = z
  .object({
    /** Its placeholder in `query`: {login}. */
    name: z.string().regex(/^[a-z][a-z0-9_]{0,29}$/u, "name en minuscules, sans espace"),
    label: z.string().trim().min(1).max(60),
    /** Shown as dots, as a password field is. */
    secret: z.boolean().default(false),
  })
  .strict();

export const sqlInjectionLabSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    schema: z.string().min(1).max(20_000),
    /**
     * The query the vulnerable server builds, a {field} where each field's
     * value is pasted: SELECT ... WHERE login = '{login}' AND password = '{password}'.
     */
    query: z.string().min(1).max(2000),
    fields: z.array(fieldSchema).min(1).max(4),
    /** What the learner must achieve, above the form. */
    goal: z.string().trim().min(1).max(600),
    /**
     * When the attack has worked: the first row, the account the form signs
     * in as, holds the value in that column (signed in as admin). Without it,
     * any row returned is a way in.
     */
    success: z
      .object({ column: z.string().min(1), equals: z.union([z.string(), z.number()]) })
      .strict()
      .optional(),
    hint: z.string().trim().min(1).max(400).optional(),
  })
  .superRefine((lab, ctx) => {
    for (const field of lab.fields) {
      if (!lab.query.includes(`{${field.name}}`)) {
        ctx.addIssue({
          code: "custom",
          path: ["query"],
          message: `la requête n'a pas de {${field.name}} : le champ ${field.label} n'irait nulle part.`,
        });
      }
    }
  });

export type SqlInjectionLab = z.infer<typeof sqlInjectionLabSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

function explain(error: z.ZodError): string {
  const issue = error.issues[0];
  const where = issue?.path.length && issue.code !== "custom" ? `${issue.path.join(".")} : ` : "";
  return `${where}${issue?.message ?? "props invalides."}`;
}

export function parseSqlPlayground(raw: unknown): Parsed<SqlPlayground> {
  const parsed = sqlPlaygroundSchema.safeParse(raw);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, problem: explain(parsed.error) };
}

export function parseSqlInjectionLab(raw: unknown): Parsed<SqlInjectionLab> {
  const parsed = sqlInjectionLabSchema.safeParse(raw);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, problem: explain(parsed.error) };
}

/**
 * The query as the vulnerable server builds it: each field's value pasted
 * where its {name} is, quotes and all. This is the flaw the lab is about.
 */
export function pasteFields(query: string, values: Record<string, string>): string {
  return query.replace(/\{([a-z][a-z0-9_]*)\}/gu, (whole, name: string) => values[name] ?? whole);
}

/**
 * The same query, parameterised: each {name}, with the quotes around it if
 * any, becomes a ?, and the values are passed apart, where SQLite never reads
 * them as SQL.
 */
export function parameterise(
  query: string,
  values: Record<string, string>,
): { sql: string; params: string[] } {
  const params: string[] = [];
  const sql = query.replace(/'?\{([a-z][a-z0-9_]*)\}'?/gu, (_whole, name: string) => {
    params.push(values[name] ?? "");
    return "?";
  });
  return { sql, params };
}
