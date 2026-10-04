import { z } from "zod";

/**
 * <CryptoWorkshop>: a bench of the encodings and toy ciphers the lessons
 * explain (Base64, hexadecimal, Caesar, Vigenère, XOR) and SHA-256, with an
 * optional message to decipher. The site and the app read the same props
 * through parseCryptoWorkshop, and run the same tools
 * (@cyberlearn/lib/crypto/workshop).
 */

export const CRYPTO_TOOLS = ["base64", "hex", "caesar", "vigenere", "xor", "sha256"] as const;
export type CryptoTool = (typeof CRYPTO_TOOLS)[number];

export const cryptoWorkshopSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    task: z.string().trim().min(1).max(600).optional(),
    /** The tools offered, in this order; the first one is open. */
    tools: z
      .array(z.enum(CRYPTO_TOOLS))
      .min(1)
      .max(CRYPTO_TOOLS.length)
      .default([...CRYPTO_TOOLS]),
    /** What the input holds at first, so the learner has something to transform. */
    input: z.string().max(2000).optional(),
    /** A message to decipher with the tools; the answer is what it says in clear. */
    challenge: z
      .object({
        ciphertext: z.string().trim().min(1).max(2000),
        answer: z.string().trim().min(1).max(500),
        /** Shown after a first wrong answer. */
        hint: z.string().trim().min(1).max(300).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((workshop, ctx) => {
    const repeated = workshop.tools.find((tool, i) => workshop.tools.indexOf(tool) !== i);
    if (repeated !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["tools"],
        message: `tools répète ${repeated} : chaque outil s'écrit une fois.`,
      });
    }
  });

export type CryptoWorkshop = z.infer<typeof cryptoWorkshopSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

/** Reads the props, or says in French what is wrong, for the lesson's author. */
export function parseCryptoWorkshop(raw: unknown): Parsed<CryptoWorkshop> {
  const parsed = cryptoWorkshopSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length && issue.code !== "custom" ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}
