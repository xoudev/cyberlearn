import { z } from "zod";

/**
 * <PhishingEmail>: a message shown as a mail client shows it, in which the
 * learner reports the suspicious parts by clicking them: the sender, the
 * subject, a paragraph, the link, the attachment. The site and the app read
 * the same props through parsePhishingEmail, and the lesson check refuses a
 * lesson whose exercise would not work.
 */

/** The parts of a message a clue can point at. A paragraph is `body-1`, `body-2`... */
const PART = /^(sender|subject|link|attachment|body-[1-9][0-9]?)$/u;

const clueSchema = z.object({
  part: z.string().regex(PART, "part vaut sender, subject, link, attachment ou body-N"),
  /** Why that part gives the message away, shown once it is found. */
  why: z.string().trim().min(1).max(400),
});

export const phishingEmailSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    fromName: z.string().trim().min(1).max(80),
    fromAddress: z.string().trim().min(3).max(120),
    subject: z.string().trim().min(1).max(160),
    body: z.array(z.string().trim().min(1).max(600)).min(1).max(8),
    linkText: z.string().trim().min(1).max(80).optional(),
    /** Where the link really goes: shown on hover, as a mail client does. */
    linkUrl: z.string().trim().min(1).max(300).optional(),
    attachment: z.string().trim().min(1).max(120).optional(),
    clues: z.array(clueSchema).min(1).max(8),
    /** What to do with such a message, shown once every clue is found. */
    conclusion: z.string().trim().min(1).max(400).optional(),
  })
  .superRefine((mail, ctx) => {
    if ((mail.linkText === undefined) !== (mail.linkUrl === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["linkText"],
        message: "linkText et linkUrl vont ensemble : le texte affiché et l'adresse réelle.",
      });
    }
    const seen = new Set<string>();
    mail.clues.forEach((clue, i) => {
      const at = ["clues", i, "part"];
      if (seen.has(clue.part)) {
        ctx.addIssue({ code: "custom", path: at, message: `${clue.part} a deux indices.` });
      }
      seen.add(clue.part);
      if (clue.part === "link" && mail.linkText === undefined) {
        ctx.addIssue({
          code: "custom",
          path: at,
          message: "un indice vise link, mais le message n'a pas de lien.",
        });
      }
      if (clue.part === "attachment" && mail.attachment === undefined) {
        ctx.addIssue({
          code: "custom",
          path: at,
          message: "un indice vise attachment, mais le message n'a pas de pièce jointe.",
        });
      }
      const paragraph = /^body-(\d+)$/u.exec(clue.part)?.[1];
      if (paragraph !== undefined && Number(paragraph) > mail.body.length) {
        ctx.addIssue({
          code: "custom",
          path: at,
          message: `${clue.part} vise un paragraphe qui n'existe pas : le message en a ${String(mail.body.length)}.`,
        });
      }
    });
  });

export type PhishingEmail = z.infer<typeof phishingEmailSchema>;

export type PhishingEmailResult =
  | { ok: true; mail: PhishingEmail }
  | { ok: false; problem: string };

/** How a part is named to the learner: « L'expéditeur », « Le paragraphe 2 ». */
export function phishingPartLabel(part: string): string {
  const paragraph = /^body-(\d+)$/u.exec(part)?.[1];
  if (paragraph !== undefined) return `Le paragraphe ${paragraph}`;
  const labels: Record<string, string> = {
    sender: "L'expéditeur",
    subject: "L'objet",
    link: "Le lien",
    attachment: "La pièce jointe",
  };
  return labels[part] ?? part;
}

/** Reads the props, or says in French what is wrong, for the lesson's author. */
export function parsePhishingEmail(raw: unknown): PhishingEmailResult {
  const parsed = phishingEmailSchema.safeParse(raw);
  if (parsed.success) return { ok: true, mail: parsed.data };
  const issue = parsed.error.issues[0];
  // The checks written above already name their prop; zod's own do not.
  const where = issue?.path.length && issue.code !== "custom" ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}
