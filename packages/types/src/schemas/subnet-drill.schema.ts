import { z } from "zod";

/**
 * <SubnetDrill>: IPv4 addressing exercises drawn at random and corrected on
 * the spot, a series at a time. The author chooses what is asked (`kinds`),
 * the prefixes the questions are drawn in, and how long a series is; the
 * questions themselves are drawn by @cyberlearn/lib/network/subnet-drill, on
 * the site and in the app alike.
 */

/**
 * What a question can ask:
 *
 * - `network`, `broadcast`, `first-host`, `last-host`: of the subnet an
 *   address sits in, given with its prefix;
 * - `hosts`: how many usable hosts a prefix leaves;
 * - `mask`: the dotted mask of a prefix; `prefix`: the prefix of a dotted mask;
 * - `same-subnet`: whether two addresses share a subnet, for a prefix;
 * - `subnets`: how many subnets cutting a network at a longer prefix gives.
 */
export const SUBNET_DRILL_KINDS = [
  "network",
  "broadcast",
  "first-host",
  "last-host",
  "hosts",
  "mask",
  "prefix",
  "same-subnet",
  "subnets",
] as const;

export type SubnetDrillKind = (typeof SUBNET_DRILL_KINDS)[number];

/** /8 to /30: a /31 or a /32 has no network and broadcast to tell apart. */
const prefixValue = z.number().int().min(8).max(30);

export const subnetDrillSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    /** A line above the questions, when the lesson wants to say what to practise. */
    task: z.string().trim().min(1).max(600).optional(),
    kinds: z
      .array(z.enum(SUBNET_DRILL_KINDS))
      .min(1)
      .max(SUBNET_DRILL_KINDS.length)
      .default([...SUBNET_DRILL_KINDS]),
    /** The prefixes the questions are drawn in, bounds included. */
    prefixes: z
      .object({ min: prefixValue, max: prefixValue })
      .strict()
      .default({ min: 24, max: 30 }),
    /** How many questions a series holds. */
    count: z.number().int().min(1).max(20).default(5),
  })
  .superRefine((drill, ctx) => {
    if (drill.prefixes.min > drill.prefixes.max) {
      ctx.addIssue({
        code: "custom",
        path: ["prefixes"],
        message: `prefixes.min vaut ${String(drill.prefixes.min)} et dépasse prefixes.max, ${String(drill.prefixes.max)}.`,
      });
    }
    const repeated = drill.kinds.find((kind, i) => drill.kinds.indexOf(kind) !== i);
    if (repeated !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["kinds"],
        message: `kinds répète ${repeated} : chaque sorte de question s'écrit une fois.`,
      });
    }
    if (drill.kinds.includes("subnets") && drill.prefixes.min === drill.prefixes.max) {
      ctx.addIssue({
        code: "custom",
        path: ["kinds"],
        message: `découper un réseau (subnets) demande deux préfixes : prefixes.min et prefixes.max valent tous deux ${String(drill.prefixes.min)}.`,
      });
    }
  });

export type SubnetDrill = z.infer<typeof subnetDrillSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

/** Reads the props, or says in French what is wrong, for the lesson's author. */
export function parseSubnetDrill(raw: unknown): Parsed<SubnetDrill> {
  const parsed = subnetDrillSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length && issue.code !== "custom" ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}
