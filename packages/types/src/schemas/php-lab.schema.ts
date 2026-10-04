import { z } from "zod";

/**
 * <PhpLab>: a small web page in real PHP (php-wasm, in a Web Worker of the
 * learner's browser) that the learner reads, attacks with a request, then
 * fixes by editing its code. The pages are served from nothing: each request
 * is played on a PHP made for it, with an empty disk and no way out (no
 * network, no process, no bridge to JavaScript). The site, the app (which
 * shows the exercise as a card) and the lesson check read the props through
 * this schema.
 */

/** A page of the lab, by path from the lab's folder: "search.php", "lib/data.php". */
const PAGE_PATH = /^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\.php$/u;
const pagePath = z
  .string()
  .regex(PAGE_PATH, "chemin de page invalide : minuscules, chiffres, - et _, et une fin en .php.");
const source = z.string().min(1).max(8000);

/** The address bar of the lab: a path and its query, as a browser would send them. */
const url = z
  .string()
  .max(500)
  .regex(
    /^\/(?!\/)[^\r\n]*$/u,
    "une adresse commence par une seule barre oblique : /page.php?q=1.",
  );

const requestFields = {
  method: z.enum(["GET", "POST"]).default("GET"),
  url,
  /** The Cookie header, as sent: "session=tok-bob". */
  cookie: z.string().max(300).optional(),
  /** The body of a POST, form-encoded: "name=Bea&x=1". */
  body: z.string().max(1000).optional(),
};

export const phpRequestSchema = z.object(requestFields).strict();

export type PhpRequestInput = z.input<typeof phpRequestSchema>;
export type PhpRequest = z.infer<typeof phpRequestSchema>;

const statusCode = z.number().int().min(100).max(599);

/**
 * What a response must be, every field given must hold:
 *
 * - `status`: its code, or one of several (403 or 404);
 * - `contains` / `notContains`: its body holds, or no longer holds, this text;
 * - `executable`: its body holds code a browser would run (a script, an event
 *   handler such as onerror=, a javascript: address), or holds none. The pages
 *   of a lab hold none of their own, so any there is came from the request.
 */
export const phpExpectSchema = z
  .object({
    status: z.union([statusCode, z.array(statusCode).min(1).max(5)]).optional(),
    contains: z.string().min(1).max(300).optional(),
    notContains: z.string().min(1).max(300).optional(),
    executable: z.boolean().optional(),
  })
  .strict()
  .refine(
    (expectation) => Object.keys(expectation).length > 0,
    "une attente vide : status, contains, notContains ou executable.",
  );

export type PhpExpect = z.infer<typeof phpExpectSchema>;

const label = z.string().trim().min(1).max(200);

/**
 * What the learner must achieve:
 *
 * - `seen`: a request the learner sent got a response such as `expect` says,
 *   at least once (the attack worked); `when` narrows which requests count,
 *   by what their address or their cookie holds;
 * - `fixed`: `request`, played on the code as it stands when the learner asks
 *   to check, gets a response such as `expect` says (the attack no longer
 *   works, the page still does).
 */
export const phpCheckSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("seen"),
      label,
      when: z
        .object({
          url: z.string().min(1).max(200).optional(),
          cookie: z.string().min(1).max(200).optional(),
        })
        .strict()
        .optional(),
      expect: phpExpectSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("fixed"),
      label,
      request: phpRequestSchema,
      expect: phpExpectSchema,
    })
    .strict(),
]);

export type PhpCheck = z.infer<typeof phpCheckSchema>;

export const phpLabSchema = z
  .object({
    id: z.string().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    task: z.string().trim().min(1).max(800),
    /** The page the learner reads and changes. */
    file: pagePath.default("index.php"),
    code: source,
    /** The pages it relies on, shown read-only: an auth.php, a data.php. */
    support: z.record(pagePath, source).optional(),
    /** Requests offered as buttons; the first fills the address bar. */
    requests: z
      .array(z.object({ label, ...requestFields }).strict())
      .max(8)
      .optional(),
    checks: z.array(phpCheckSchema).max(12).optional(),
    hints: z.array(z.string().trim().min(1).max(400)).max(8).optional(),
  })
  .superRefine((lab, ctx) => {
    const support = lab.support ?? {};
    if (Object.keys(support).length > 5) {
      ctx.addIssue({ code: "custom", message: "au plus cinq pages d'appui.", path: ["support"] });
    }
    if (lab.file in support) {
      ctx.addIssue({
        code: "custom",
        message: `${lab.file} est la page à modifier : elle ne peut pas être aussi une page d'appui.`,
        path: ["support"],
      });
    }
    for (const [path, page] of [[lab.file, lab.code] as const, ...Object.entries(support)]) {
      if (/vrzno/iu.test(page)) {
        ctx.addIssue({
          code: "custom",
          message: `${path} nomme Vrzno : le pont vers JavaScript est fermé dans un labo.`,
          path: ["code"],
        });
      }
    }
  });

export type PhpLab = z.infer<typeof phpLabSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

export function parsePhpLab(raw: unknown): Parsed<PhpLab> {
  const parsed = phpLabSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length && issue.code !== "custom" ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}

/** The lab's pages as the PHP runs them: the learner's version of the page, and the pages it relies on. */
export function phpLabFiles(lab: PhpLab, code: string = lab.code): Record<string, string> {
  return { ...lab.support, [lab.file]: code };
}
