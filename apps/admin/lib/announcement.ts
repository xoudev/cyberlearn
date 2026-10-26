import { z } from "zod";
import type { AnnouncementAudience, UserRole } from "@cyberlearn/db";
import { AUDIT_ACTION } from "@cyberlearn/db/audit-actions";
import { ROLE_LABEL, ROLES } from "./roles";

/**
 * A console announcement: what the form sends, what the action accepts, how
 * its audience is named, and the audit row it leaves - written here and read
 * back by the page's history, so the two cannot drift.
 *
 * Pure: the form imports it as well as the action.
 */

export const ANNOUNCEMENT_LIMITS = {
  titleMin: 3,
  /** notifications.title is a VARCHAR(200). */
  titleMax: 200,
  /** notifications.body is a VARCHAR(1000). */
  bodyMax: 1_000,
  linkMax: 500,
  maxClasses: 200,
} as const;

/** The audit action an announcement writes, and the one its history reads. */
export const ANNOUNCEMENT_ACTION = AUDIT_ACTION.announcement.send;
export const ANNOUNCEMENT_TARGET = "Announcement";

const AUDIENCE_ROLES = ["STUDENT", "TEACHER", "ADMIN"] as const satisfies readonly UserRole[];

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * A page of the learner site, which the bell links to: one leading slash, so
 * "//evil.com" is not a way out, and no backslash, whitespace or control
 * character, which some parsers read as a separator or strip before resolving.
 */
export function isLearnerPath(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\s\\]/u.test(value) &&
    !hasControlCharacter(value)
  );
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

export const audienceSchema = z.discriminatedUnion(
  "kind",
  [
    z.object({ kind: z.literal("ALL") }),
    z.object({
      kind: z.literal("ROLES"),
      roles: z
        .array(z.enum(AUDIENCE_ROLES, "Un des rôles choisis n'existe pas."))
        .min(1, "Choisis au moins un rôle.")
        .max(AUDIENCE_ROLES.length)
        .transform(unique),
    }),
    z.object({
      kind: z.literal("CLASSES"),
      classIds: z
        .array(z.guid("Une des classes choisies n'existe pas."))
        .min(1, "Choisis au moins une classe.")
        .max(ANNOUNCEMENT_LIMITS.maxClasses, "Trop de classes pour une seule annonce.")
        .transform(unique),
    }),
  ],
  "Choisis à qui envoyer l'annonce.",
);

export const announcementSchema = z.object({
  title: z
    .string("Le titre manque.")
    .trim()
    .min(ANNOUNCEMENT_LIMITS.titleMin, "Un titre de 3 caractères au moins.")
    .max(ANNOUNCEMENT_LIMITS.titleMax, "Le titre fait 200 caractères au plus."),
  body: z
    .string("Le message manque.")
    .trim()
    .min(1, "Écris le message de l'annonce.")
    .max(ANNOUNCEMENT_LIMITS.bodyMax, "Le message fait 1 000 caractères au plus."),
  actionUrl: z
    .string()
    .trim()
    .max(ANNOUNCEMENT_LIMITS.linkMax, "Le lien fait 500 caractères au plus.")
    .refine(
      (value) => value === "" || isLearnerPath(value),
      "Le lien est une page du site : il commence par une seule « / », sans espace (/paths, /lessons/mon-slug).",
    )
    .optional()
    .transform((value) => (value === undefined || value === "" ? undefined : value)),
  audience: audienceSchema,
});

/** The send carries the count the administrator confirmed. */
export const sendAnnouncementSchema = announcementSchema.extend({
  confirmedRecipients: z.number().int().min(1),
});

export type AnnouncementInput = z.input<typeof announcementSchema>;
export type Announcement = z.output<typeof announcementSchema>;

/** The first thing wrong with a refused announcement, in the form's words. */
export function announcementProblem(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Annonce invalide.";
}

/** Class names past this many are counted rather than listed. */
const NAMED_CLASSES = 4;

/**
 * The audience in words, for the confirmation and the history: "Tous les
 * comptes", "Rôles : Admin, Professeur", "Classes : SIO1-A, SIO1-B".
 */
export function audienceLabel(
  audience: AnnouncementAudience,
  classNames: ReadonlyMap<string, string>,
): string {
  switch (audience.kind) {
    case "ALL":
      return "Tous les comptes";
    case "ROLES": {
      const roles = ROLES.filter((role) => audience.roles.includes(role));
      return `${roles.length > 1 ? "Rôles" : "Rôle"} : ${roles.map((role) => ROLE_LABEL[role]).join(", ")}`;
    }
    case "CLASSES": {
      const names = audience.classIds.map((id) => classNames.get(id) ?? "classe inconnue");
      const shown = names.slice(0, NAMED_CLASSES).join(", ");
      const rest = names.length - NAMED_CLASSES;
      const list = rest > 0 ? `${shown} et ${String(rest)} autre${rest > 1 ? "s" : ""}` : shown;
      return `${names.length > 1 ? "Classes" : "Classe"} : ${list}`;
    }
  }
}

/**
 * What the audit row keeps of an announcement. Everything the history shows
 * is in it, the audience in words included: a class renamed or archived later
 * does not rewrite who a message went to.
 */
export function announcementTrace(
  announcement: Announcement,
  label: string,
  recipients: number,
): {
  title: string;
  body: string;
  actionUrl: string | null;
  audience: AnnouncementAudience;
  audienceLabel: string;
  recipients: number;
} {
  return {
    title: announcement.title,
    body: announcement.body,
    actionUrl: announcement.actionUrl ?? null,
    audience: announcement.audience,
    audienceLabel: label,
    recipients,
  };
}

const traceSchema = z.object({
  title: z.string(),
  body: z.string().catch(""),
  actionUrl: z.string().nullable().catch(null),
  audienceLabel: z.string().catch("Audience inconnue"),
  recipients: z.number().int().nonnegative(),
});

export type AnnouncementTrace = z.infer<typeof traceSchema>;

/** An audit row's metadata read back as an announcement, or null when it is not one. */
export function readAnnouncementTrace(metadata: unknown): AnnouncementTrace | null {
  const parsed = traceSchema.safeParse(metadata);
  return parsed.success ? parsed.data : null;
}
