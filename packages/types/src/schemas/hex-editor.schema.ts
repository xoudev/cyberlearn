import { z } from "zod";

/**
 * <HexEditor>: the bytes of a small file to read, repair and search. The
 * author gives the bytes in hexadecimal, what must be repaired (the bytes
 * expected at an offset) and questions whose answers are in the bytes. The
 * site and the app read the same props through parseHexEditor; the reading of
 * the bytes is in @cyberlearn/lib/files/hex.
 */

const HEX_TEXT = /^\s*(?:[0-9a-fA-F]{2}\s*)+$/u;
const hexText = z
  .string()
  .max(12000)
  .regex(HEX_TEXT, "des octets en hexadécimal, deux chiffres par octet : 89 50 4e 47.");

/** How many bytes a hexadecimal text holds. */
export function hexByteCount(text: string): number {
  return text.replace(/\s+/gu, "").length / 2;
}

export const hexRepairSchema = z
  .object({
    label: z.string().trim().min(1).max(160),
    offset: z.number().int().min(0),
    bytes: hexText.max(200),
  })
  .strict();

export const hexQuestionSchema = z
  .object({
    label: z.string().trim().min(1).max(200),
    answer: z.union([
      z.string().trim().min(1).max(120),
      z.array(z.string().trim().min(1).max(120)).min(1).max(8),
    ]),
    hint: z.string().trim().min(1).max(300).optional(),
  })
  .strict();

export const hexEditorSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    task: z.string().trim().min(1).max(600),
    /** The file, as the learner finds it. */
    bytes: hexText,
    /** The name shown for the file, as a prompt: "facture.pdf". */
    filename: z.string().trim().min(1).max(80).optional(),
    /** Whether the learner may change the bytes (default: yes). */
    editable: z.boolean().default(true),
    /** What must read right for the file to be repaired. */
    repairs: z.array(hexRepairSchema).max(8).optional(),
    questions: z.array(hexQuestionSchema).max(6).optional(),
    hints: z.array(z.string().trim().min(1).max(400)).max(6).optional(),
  })
  .strict()
  .superRefine((editor, ctx) => {
    const count = hexByteCount(editor.bytes);
    if (count > 2048) {
      ctx.addIssue({
        code: "custom",
        path: ["bytes"],
        message: `${String(count)} octets : au plus 2048, pour que la grille reste lisible.`,
      });
    }
    editor.repairs?.forEach((repair, i) => {
      if (repair.offset + hexByteCount(repair.bytes) > count) {
        ctx.addIssue({
          code: "custom",
          path: ["repairs", i],
          message: `la réparation « ${repair.label} » dépasse la fin du fichier (${String(count)} octets).`,
        });
      }
    });
    if (editor.repairs !== undefined && editor.repairs.length > 0 && !editor.editable) {
      ctx.addIssue({
        code: "custom",
        path: ["editable"],
        message: "des réparations sont demandées : les octets doivent être modifiables.",
      });
    }
  });

export type HexEditor = z.infer<typeof hexEditorSchema>;
export type HexRepair = z.infer<typeof hexRepairSchema>;
export type HexQuestion = z.infer<typeof hexQuestionSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

/** Reads the props, or says in French what is wrong, for the lesson's author. */
export function parseHexEditor(raw: unknown): Parsed<HexEditor> {
  const parsed = hexEditorSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length && issue.code !== "custom" ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}
