import { colors } from "@cyberlearn/tokens";

/**
 * The glyph and the colour of each kind of notification, on the inbox screen.
 *
 * The list is the database's (enum NotificationType in
 * packages/db/prisma/schema.prisma), which the app cannot import: it holds
 * only the types that exist, and the table below is keyed on it, so a type
 * added here does not compile until it has its own glyph. The screen used to
 * key on bare strings, with two types nothing sends (REVIEW_DUE, LEAGUE) and
 * eleven real ones missing, every one of them drawn as the same neutral dot.
 * The site gives each type its own (apps/web/components/notification-panel.tsx).
 */
export const NOTIFICATION_TYPES = [
  "REVIEW_REMINDER",
  "BADGE_EARNED",
  "LEVEL_UP",
  "PATH_COMPLETED",
  "CERTIFICATE_ISSUED",
  "ANNOUNCEMENT",
  "TICKET_UPDATE",
  "CLASS_ENROLLED",
  "LESSON_ASSIGNED",
  "PATH_ASSIGNED",
  "NOTE_SHARED",
  "MODERATION_ALERT",
  "FORUM_REPLY",
  "FRIEND_REQUEST",
  "FRIEND_ACCEPTED",
  "DUEL_INVITE",
  "DUEL_RESULT",
  "TOURNAMENT_ANNOUNCED",
  "CERTIFICATE_REVOKED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationMeta {
  icon: string;
  color: string;
}

// Glyphs that take the colour, drawn in a ring, rather than the site's emoji;
// the two friend types get an outlined then a filled face, as the site marks
// a pending request and an accepted one with the same drawing.
const META: Record<NotificationType, NotificationMeta> = {
  REVIEW_REMINDER: { icon: "↻", color: colors.textSecondary },
  BADGE_EARNED: { icon: "◆", color: colors.warning },
  LEVEL_UP: { icon: "▲", color: colors.accent },
  PATH_COMPLETED: { icon: "✓", color: colors.success },
  CERTIFICATE_ISSUED: { icon: "❖", color: colors.info },
  ANNOUNCEMENT: { icon: "✦", color: colors.accent },
  TICKET_UPDATE: { icon: "✉", color: colors.textSecondary },
  CLASS_ENROLLED: { icon: "✚", color: colors.promote },
  LESSON_ASSIGNED: { icon: "▸", color: colors.accent },
  PATH_ASSIGNED: { icon: "→", color: colors.accent },
  NOTE_SHARED: { icon: "✎", color: colors.info },
  MODERATION_ALERT: { icon: "⚠", color: colors.danger },
  FORUM_REPLY: { icon: "❝", color: colors.info },
  FRIEND_REQUEST: { icon: "☺", color: colors.accent },
  FRIEND_ACCEPTED: { icon: "☻", color: colors.accent },
  DUEL_INVITE: { icon: "⚔", color: colors.accent },
  DUEL_RESULT: { icon: "⚑", color: colors.warning },
  TOURNAMENT_ANNOUNCED: { icon: "🏆", color: colors.accent },
  CERTIFICATE_REVOKED: { icon: "⊘", color: colors.danger },
};

const FALLBACK: NotificationMeta = { icon: "•", color: colors.textSecondary };

function isNotificationType(type: string): type is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(type);
}

/** How a notification of this type is marked; a neutral dot for a type this build does not know. */
export function notificationMeta(type: string): NotificationMeta {
  return isNotificationType(type) ? META[type] : FALLBACK;
}
