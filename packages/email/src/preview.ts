import { render } from "@react-email/components";
import { AccountDeletedEmail } from "./templates/account-deleted.js";
import { AccountDeletionConfirmEmail } from "./templates/account-deletion-confirm.js";
import { BanNoticeEmail } from "./templates/ban-notice.js";
import { ClassEnrolledEmail } from "./templates/class-enrolled.js";
import { ClassInvitationEmail } from "./templates/class-invitation.js";
import { MagicLinkEmail } from "./templates/magic-link.js";
import { ModerationNoticeEmail } from "./templates/moderation-notice.js";
import { TicketReplyEmail } from "./templates/ticket-reply.js";
import { WorkAssignedEmail } from "./templates/work-assigned.js";

/**
 * Every template, with something plausible in it, rendered to HTML.
 *
 * The samples live beside the templates rather than in the console that shows
 * them, because they are the templates' own fixtures: somebody adding a
 * template or changing a prop is editing this file in the same breath, and a
 * catalogue kept in another package is a catalogue that goes stale.
 *
 * Nothing here sends anything. It builds the same markup the send functions
 * build and hands back a string - which is the only way to look at nine
 * templates without nine e-mails arriving somewhere.
 *
 * The sample text is deliberately ordinary and deliberately long enough to
 * wrap: a template looks fine with "Test" in every field and falls apart on a
 * real class name.
 */

const SITE = "https://cyberlearn.fr";

export interface EmailSample {
  /** Stable id, for a query string or a key. */
  key: string;
  /** What it is, in the console's own language. */
  label: string;
  /** When it goes out, so the list reads as a set of events. */
  when: string;
}

/** The catalogue, in the order a person would think about them. */
export const EMAIL_SAMPLES: EmailSample[] = [
  { key: "magic-link", label: "Lien de connexion", when: "à chaque connexion par e-mail" },
  { key: "magic-link-signup", label: "Lien d'inscription", when: "à la création du compte" },
  { key: "class-invitation", label: "Invitation en classe", when: "invitation d'un externe" },
  { key: "class-enrolled", label: "Inscription en classe", when: "ajout à une classe" },
  { key: "work-assigned", label: "Travail assigné", when: "leçon ou parcours donné à une classe" },
  { key: "ticket-reply", label: "Réponse à un ticket", when: "réponse de la console" },
  { key: "moderation-notice", label: "Avis de modération", when: "contenu signalé ou refusé" },
  { key: "ban-notice", label: "Suspension de compte", when: "bannissement" },
  {
    key: "deletion-confirm",
    label: "Confirmation de suppression",
    when: "demande de l'utilisateur",
  },
  { key: "account-deleted", label: "Compte supprimé", when: "suppression par un administrateur" },
];

/** The rendered HTML for one sample, or null for a key nothing matches. */
export async function renderEmailSample(key: string): Promise<string | null> {
  switch (key) {
    case "magic-link":
      return render(MagicLinkEmail({ magicLink: `${SITE}/auth/callback?token=exemple` }));
    case "magic-link-signup":
      return render(
        MagicLinkEmail({ magicLink: `${SITE}/auth/callback?token=exemple`, type: "signup" }),
      );
    case "class-invitation":
      return render(
        ClassInvitationEmail({
          className: "SIO1-A · Cybersécurité",
          establishmentName: "Lycée Jean-Moulin",
          promotionName: "2025-2026",
          email: "eleve@ecole.fr",
          expiresAt: "30 octobre 2026",
          signUpUrl: `${SITE}/signup?invitation=exemple`,
        }),
      );
    case "class-enrolled":
      return render(
        ClassEnrolledEmail({
          displayName: "Amélie",
          className: "SIO1-A · Cybersécurité",
          establishmentName: "Lycée Jean-Moulin",
          promotionName: "2025-2026",
          teacherNames: ["Claire Fontaine", "Marc Olivier"],
          profileUrl: `${SITE}/profile`,
        }),
      );
    case "work-assigned":
      return render(
        WorkAssignedEmail({
          displayName: "Amélie",
          kind: "lesson",
          workTitle: "Le modèle OSI, couche par couche",
          className: "SIO1-A · Cybersécurité",
          teacherName: "Claire Fontaine",
          dueLabel: "vendredi 3 octobre",
          instructions: "Lis la leçon en entier avant de faire le quiz, il porte sur la fin.",
          workUrl: `${SITE}/lessons/modele-osi`,
          siteUrl: SITE,
        }),
      );
    case "ticket-reply":
      return render(
        TicketReplyEmail({
          displayName: "Amélie",
          subject: "Je n'arrive pas à rejoindre ma classe",
          reply:
            "Bonjour, ton invitation avait expiré. Je viens d'en renvoyer une à la même adresse, " +
            "elle est valable trente jours. Dis-moi si elle n'arrive pas.",
          statusLabel: "Résolu",
          ticketUrl: `${SITE}/support/exemple`,
          siteUrl: SITE,
        }),
      );
    case "moderation-notice":
      return render(
        ModerationNoticeEmail({
          displayName: "Amélie",
          title: "Ta note n'a pas été partagée",
          body:
            "La modération automatique a signalé ta note, donc le partage n'a pas eu lieu. " +
            "Ta note est toujours là, telle que tu l'as écrite : tu peux la modifier et la " +
            "repartager.",
          excerpt: "Tu est nul vas te faire foutre",
          recordUrl: `${SITE}/settings/moderation`,
          siteUrl: SITE,
        }),
      );
    case "ban-notice":
      return render(
        BanNoticeEmail({
          displayName: "Amélie",
          reason: "Propos insultants répétés dans le forum, après un premier avertissement.",
          durationLabel: "7 jours",
          endsOn: "28 septembre 2026",
          appealUrl: `${SITE}/support`,
          siteUrl: SITE,
        }),
      );
    case "deletion-confirm":
      return render(
        AccountDeletionConfirmEmail({
          displayName: "Amélie",
          confirmUrl: `${SITE}/settings/data/confirm?token=exemple`,
        }),
      );
    case "account-deleted":
      return render(
        AccountDeletedEmail({
          displayName: "Amélie",
          deletedAt: "21 septembre 2026",
          contactEmail: "contact@cyberlearn.fr",
          reason: "Demande de l'utilisateur, après vérification de son identité.",
        }),
      );
    default:
      return null;
  }
}
