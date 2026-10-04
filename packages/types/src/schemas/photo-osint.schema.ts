import { z } from "zod";

/**
 * <PhotoOsint>: a photo whose real metadata the learner reads (exifr, in the
 * browser), then the place it was taken, found on a map drawn without any
 * external tile (Natural Earth outlines shipped with the site). The site, the
 * app (which shows it as a card) and the lesson check read the props through
 * this schema.
 */

export const photoOsintSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(120).optional(),
  /** A picture shipped with the site, in apps/web/public/osint. */
  src: z
    .string()
    .regex(
      /^\/osint\/[a-z0-9-]{1,60}\.jpg$/u,
      "la photo est un .jpg de public/osint (/osint/nom.jpg).",
    ),
  alt: z.string().trim().min(1).max(300),
  /** What is said about the photo where it circulates, shown under it. */
  caption: z.string().trim().min(1).max(300).optional(),
  task: z.string().trim().min(1).max(600),
  /** Where the photo was taken, and how close the learner's point must be. */
  answer: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      radiusKm: z.number().min(0.1).max(500).default(20),
    })
    .strict(),
  /** The place, named once it is found. */
  place: z.string().trim().min(1).max(200),
  conclusion: z.string().trim().min(1).max(600).optional(),
  hints: z.array(z.string().trim().min(1).max(400)).max(6).optional(),
});

export type PhotoOsint = z.infer<typeof photoOsintSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

export function parsePhotoOsint(raw: unknown): Parsed<PhotoOsint> {
  const parsed = photoOsintSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}
