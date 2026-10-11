/**
 * The notification settings, in the words the site uses, for the site's
 * settings drawer and the app's settings screen alike. Each says what
 * actually happens: a switch for something that nothing sends yet is not
 * shown at all, rather than shown disabled. A greyed-out switch that never
 * comes alive is a control that does nothing, and people try it anyway.
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
  /** False while nothing sends it: the switch is left out until it is. */
  available: boolean;
}

export const NOTIFICATION_SETTINGS: readonly NotificationSetting[] = [
  {
    key: "reviewReminders",
    name: "Rappels de révision",
    desc: "Une notification quand des leçons attendent une révision.",
    info: "Une fois par jour au plus, dans la cloche, quand la répétition espacée te ramène des leçons à revoir. Aucun email ne part pour ça.",
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
    info: null,
    // No cron sends it yet.
    available: false,
  },
  {
    key: "weeklyDigest",
    name: "Nouveautés produit",
    desc: "Nouveaux parcours, fonctionnalités, événements CTF.",
    info: null,
    // Stored, but nothing reads it: there is no digest and no sender.
    available: false,
  },
];

/** The switches both apps show: the ones something actually sends. */
export const SHOWN_NOTIFICATION_SETTINGS: readonly NotificationSetting[] =
  NOTIFICATION_SETTINGS.filter((setting) => setting.available);

/** The spaced-repetition switch, which lives with the preferences on the site. */
export const SPACED_REPETITION_SETTING = {
  name: "Répétition espacée",
  descOn: "Les leçons terminées reviennent à réviser, et tu es prévenu quand c'est le moment.",
  descOff: "Coupée. Rien ne revient à réviser et plus aucune notification de révision ne part.",
} as const;
