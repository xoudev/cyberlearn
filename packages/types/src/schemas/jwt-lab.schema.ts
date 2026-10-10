import { z } from "zod";

/**
 * <JwtLab>: a sandbox where the learner takes a JWT apart, then gets a forged
 * one accepted by a verifier that is set up wrongly on purpose (it trusts
 * `alg: none`, it signs with a secret from a dictionary, it lets the token
 * choose its own algorithm), and finally watches the corrected verifiers
 * refuse the same tokens. The sample keys, secrets and tokens belong to the
 * platform and live in @cyberlearn/lib/crypto/jwt-lab; the site and the app
 * read the same props through parseJwtLab and run the same verifiers.
 */

/** The steps of the lab, in the order a lesson would play them. */
export const JWT_LEVELS = ["decode", "none", "weak-secret", "confusion", "fixed"] as const;
export type JwtLevel = (typeof JWT_LEVELS)[number];

/** The steps that give something to forge, and so something to replay once the verifiers are corrected. */
export const JWT_ATTACK_LEVELS = ["none", "weak-secret", "confusion"] as const;

export const jwtLabSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    task: z.string().trim().min(1).max(600).optional(),
    /** The steps offered, in this order; the first one is open. */
    levels: z
      .array(z.enum(JWT_LEVELS))
      .min(1)
      .max(JWT_LEVELS.length)
      .default([...JWT_LEVELS]),
  })
  .strict()
  .superRefine((lab, ctx) => {
    const repeated = lab.levels.find((level, i) => lab.levels.indexOf(level) !== i);
    if (repeated !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["levels"],
        message: `levels répète ${repeated} : chaque étape s'écrit une fois.`,
      });
      return;
    }
    const attacks = lab.levels.filter((level) =>
      (JWT_ATTACK_LEVELS as readonly string[]).includes(level),
    );
    if (lab.levels.includes("fixed") && attacks.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["levels"],
        message:
          "levels demande « fixed » sans attaque à rejouer : ajoute « none », « weak-secret » ou « confusion ».",
      });
    }
  });

export type JwtLab = z.infer<typeof jwtLabSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

/** Reads the props, or says in French what is wrong, for the lesson's author. */
export function parseJwtLab(raw: unknown): Parsed<JwtLab> {
  const parsed = jwtLabSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length && issue.code !== "custom" ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}

/**
 * What the lab reads of a token it is handed, typed by the learner or forged
 * by an attack: JSON object text first, then only the fields the verifiers
 * look at. Extra fields stay (a claim of the learner's own is not an error).
 */
export const jsonObjectSchema = z.record(z.string(), z.unknown());

export const jwtHeaderSchema = z.looseObject({
  alg: z.string(),
  typ: z.string().optional(),
});

export const jwtClaimsSchema = z.looseObject({
  sub: z.string().optional(),
  role: z.string().optional(),
  iss: z.string().optional(),
  aud: z.union([z.string(), z.array(z.string())]).optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type JwtHeader = z.infer<typeof jwtHeaderSchema>;
export type JwtClaims = z.infer<typeof jwtClaimsSchema>;
