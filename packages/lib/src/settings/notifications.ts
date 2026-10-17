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
    desc: "Une notification quand ton rappel du jour est prêt.",
    info: "Une fois par jour au plus, dans la cloche, quand des questions de tes leçons reviennent au rappel du jour et qu'il n'est pas encore fait. Aucun email ne part pour ça.",
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
  descOn:
    "Les questions ratées dans tes leçons reviennent au rappel du jour, six au plus, et tu es prévenu quand il est prêt.",
  descOff: "Coupée. Aucune question ne revient et plus aucun rappel ne part.",
  /** The longer explanation behind the (i). */
  info: "Chaque jour, le rappel pose six questions au plus, celles que tu as ratées dans tes leçons d'abord, en boîtes de Leitner : une bonne réponse fait revenir la question plus tard (1, 3, 7 puis 21 jours), puis la retire ; une erreur la ramène au lendemain. Le rappel fait rapporte 15 XP et compte pour ta série. Couper la répétition espacée retire le rappel du jour, son entrée Révisions, sa carte du tableau de bord et ses notifications ; « Réviser ce module », sur la page d'un parcours, reste là, sans XP. Rien n'est supprimé : réactivée, elle reprend où elle s'était arrêtée.",
} as const;
