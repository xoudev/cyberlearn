import { z } from "zod";

/**
 * <FirewallLab>: a host firewall's rules to write, and test packets that go
 * through them. The author gives the rules the exercise starts with and the
 * packets with what should happen to each; the lab (@cyberlearn/lib/network/
 * firewall) reads the rules and decides. The site and the app read the same
 * props through parseFirewallLab.
 */

const ipv4 = z
  .string()
  .regex(
    /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/u,
    "une adresse IPv4 s'écrit en quatre nombres de 0 à 255 : 198.51.100.7.",
  );

export const firewallProbeSchema = z
  .object({
    /** What the packet is, for the learner: "Un visiteur ouvre le site". */
    label: z.string().trim().min(1).max(160),
    proto: z.enum(["tcp", "udp", "icmp"]),
    from: ipv4,
    /** The destination port; none for icmp. */
    port: z.number().int().min(0).max(65535).optional(),
    /** A reply to a connection the machine opened, or a new connection. */
    state: z.enum(["new", "established"]).default("new"),
    /** What the firewall must do with it once the exercise is done. */
    expect: z.enum(["accept", "block"]),
  })
  .strict()
  .superRefine((probe, ctx) => {
    if (probe.proto === "icmp" && probe.port !== undefined) {
      ctx.addIssue({ code: "custom", path: ["port"], message: "un paquet icmp n'a pas de port." });
    }
    if (probe.proto !== "icmp" && probe.port === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["port"],
        message: `un paquet ${probe.proto} vise un port : donne-le.`,
      });
    }
  });

export type FirewallProbe = z.infer<typeof firewallProbeSchema>;

export const firewallLabSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    task: z.string().trim().min(1).max(600),
    /** The rules the exercise starts with, one a line; read by the lab's own parser. */
    rules: z.string().max(2000).default("policy accept"),
    probes: z.array(firewallProbeSchema).min(1).max(10),
    hints: z.array(z.string().trim().min(1).max(400)).max(6).optional(),
  })
  .strict()
  .superRefine((lab, ctx) => {
    const labels = lab.probes.map((p) => p.label);
    const repeated = labels.find((label, i) => labels.indexOf(label) !== i);
    if (repeated !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["probes"],
        message: `deux paquets s'appellent « ${repeated} » : donne-leur des noms différents.`,
      });
    }
  });

export type FirewallLab = z.infer<typeof firewallLabSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

/** Reads the props, or says in French what is wrong, for the lesson's author. */
export function parseFirewallLab(raw: unknown): Parsed<FirewallLab> {
  const parsed = firewallLabSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length && issue.code !== "custom" ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}
