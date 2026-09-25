/**
 * The notification settings, in the words the site uses, for the site's
 * /settings/notifications and the app's settings screen alike. Each says what
 * actually happens: a switch for something that is not sent yet is shown, and
 * shown as not available, rather than promising it.
 */

export type NotificationSettingKey =
  | "reviewReminders"
  | "emailNotifications"
  | "streakReminder"
  | "weeklyDigest";

export interface NotificationSetting {
  key: NotificationSettingKey;
  name: string;
  desc: string;
  /** The longer explanation behind the (i). */
  info: string | null;
  /** False while nothing sends it: the switch is shown, and disabled. */
  available: boolean;
}

export const NOTIFICATION_SETTINGS: readonly NotificationSetting[] = [
  {
    key: "reviewReminders",
    name: "Rappels de révision",
    desc: "Email quand une mission attend une révision.",
    info: "On t'envoie un email quand une leçon doit être révisée (répétition espacée) pour ancrer ce que tu as appris.",
    available: true,
  },
  {
    key: "emailNotifications",
    name: "Avis par email",
    desc: "Email quand la modération décide d'un de tes messages, ou quand ta classe te donne du travail.",
    info: "Ces avis arrivent aussi dans la cloche : l'email en est la copie. Coupé, tu les retrouves à ton prochain passage.",
    available: true,
  },
  {
    key: "streakReminder",
    name: "Alerte de série",
    desc: "Préviens-moi avant de perdre ma série quotidienne.",
    info: "Prochainement - l'envoi de cette alerte est en cours de préparation.",
    available: false,
  },
  {
    key: "weeklyDigest",
    name: "Nouveautés produit",
    desc: "Nouveaux parcours, fonctionnalités, événements CTF.",
    info: null,
    available: true,
  },
];

/** The spaced-repetition switch, which lives with the preferences on the site. */
export const SPACED_REPETITION_SETTING = {
  name: "Répétition espacée",
  descOn: "Les leçons terminées reviennent à réviser, et tu es prévenu quand c'est le moment.",
  descOff: "Coupée. Rien ne revient à réviser et plus aucune notification de révision ne part.",
} as const;
