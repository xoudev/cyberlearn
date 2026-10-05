import { z } from "zod";

/**
 * <LogHunt>: a table of log events, normalized the way a SIEM shows them, to
 * filter and count until the attack stands out; then questions whose answers
 * are in the table. The author writes the events that matter one by one, and
 * describes the rest as series the lab draws (@cyberlearn/lib/logs/hunt),
 * always the same for a given exercise. The site and the app read the same
 * props through parseLogHunt.
 */

const TIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/u;
const time = z.string().regex(TIME, "une heure s'écrit AAAA-MM-JJ HH:MM:SS : 2026-01-10 03:14:02.");
const ipv4 = z
  .string()
  .regex(
    /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/u,
    "une adresse IPv4 s'écrit en quatre nombres de 0 à 255 : 203.0.113.9.",
  );
const word = z.string().trim().min(1).max(40);
const action = z.string().trim().min(1).max(160);

/** One event, as the SIEM has normalized it. */
export const logEventSchema = z
  .object({
    time,
    /** What wrote it: sshd, nginx, firewall, windows. */
    source: word,
    host: word.optional(),
    ip: ipv4.optional(),
    user: word.optional(),
    /** What happened: "Failed password", "GET /admin 404", "DROP tcp 5432". */
    action,
  })
  .strict();

export type LogEvent = z.infer<typeof logEventSchema>;

/** Events drawn alike: a value of each list, a time in the window, `count` times. */
export const logSeriesSchema = z
  .object({
    count: z.number().int().min(1).max(400),
    from: time,
    to: time,
    source: word,
    hosts: z.array(word).min(1).max(20).optional(),
    ips: z.array(ipv4).min(1).max(40).optional(),
    users: z.array(word).min(1).max(40).optional(),
    actions: z.array(action).min(1).max(40),
  })
  .strict()
  .refine((series) => series.from < series.to, "from doit précéder to.");

export type LogSeries = z.infer<typeof logSeriesSchema>;

export const logQuestionSchema = z
  .object({
    label: z.string().trim().min(1).max(200),
    /** The answer, or the answers accepted (an hour with or without its seconds). */
    answer: z.union([
      z.string().trim().min(1).max(120),
      z.array(z.string().trim().min(1).max(120)).min(1).max(6),
    ]),
    hint: z.string().trim().min(1).max(300).optional(),
  })
  .strict();

export type LogQuestion = z.infer<typeof logQuestionSchema>;

export const logHuntSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    task: z.string().trim().min(1).max(600),
    /** The events that matter, written one by one. */
    events: z.array(logEventSchema).max(80).default([]),
    /** The rest, drawn: the noise, and the bursts too many to write by hand. */
    series: z.array(logSeriesSchema).max(12).default([]),
    questions: z.array(logQuestionSchema).min(1).max(6),
  })
  .strict()
  .superRefine((hunt, ctx) => {
    if (hunt.events.length === 0 && hunt.series.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "il faut des événements : events, series, ou les deux.",
      });
    }
    const total = hunt.events.length + hunt.series.reduce((n, s) => n + s.count, 0);
    if (total > 1500) {
      ctx.addIssue({
        code: "custom",
        path: ["series"],
        message: `${String(total)} événements : au plus 1500, pour que la table reste lisible.`,
      });
    }
  });

export type LogHunt = z.infer<typeof logHuntSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

/** Reads the props, or says in French what is wrong, for the lesson's author. */
export function parseLogHunt(raw: unknown): Parsed<LogHunt> {
  const parsed = logHuntSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length && issue.code !== "custom" ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}
