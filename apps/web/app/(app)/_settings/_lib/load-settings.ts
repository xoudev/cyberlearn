import type { User } from "@supabase/supabase-js";
import { moderationRepository, prisma } from "@cyberlearn/db";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import type {
  AccountSectionData,
  DataSectionData,
  ModerationSectionData,
  NotificationsSectionData,
  PreferencesSectionData,
  PrivacySectionData,
  ProfileSectionData,
  SettingsData,
} from "./settings-data";

/**
 * Reads each settings section for one person, on the server, for the
 * drawer's request (/api/me/settings), which calls them all at once.
 *
 * The defaults when a row is missing: privacy first for the leaderboard,
 * every reminder on.
 */

export async function loadProfileSection(userId: string): Promise<ProfileSectionData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, displayName: true, bio: true, avatarUrl: true },
  });
  const avatarUrl = user?.avatarUrl ?? "";
  // An uploaded photo needs a signed URL for its preview; built-ins and
  // glyphs pass through unchanged (the form draws those itself).
  const avatarPreview = avatarUrl.startsWith("__upload:")
    ? await resolveAvatarSrc(avatarUrl)
    : null;
  return {
    username: user?.username ?? "",
    displayName: user?.displayName ?? "",
    bio: user?.bio ?? "",
    avatarUrl,
    avatarPreview,
  };
}

export async function loadPrivacySection(userId: string): Promise<PrivacySectionData> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { leaderboardVisibility: true, publicProfile: true, friendsLeaderboard: true },
  });
  return {
    visibility: prefs?.leaderboardVisibility ?? "ANONYMOUS",
    publicProfile: prefs?.publicProfile ?? true,
    friendsLeaderboard: prefs?.friendsLeaderboard ?? false,
  };
}

export async function loadPreferencesSection(userId: string): Promise<PreferencesSectionData> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { spacedRepetition: true },
  });
  return { spacedRepetition: prefs?.spacedRepetition ?? true };
}

export async function loadNotificationsSection(userId: string): Promise<NotificationsSectionData> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: {
      reviewReminders: true,
      weeklyDigest: true,
      streakReminder: true,
      emailNotifications: true,
    },
  });
  return {
    reviewReminders: prefs?.reviewReminders ?? true,
    weeklyDigest: prefs?.weeklyDigest ?? true,
    streakReminder: prefs?.streakReminder ?? true,
    emailNotifications: prefs?.emailNotifications ?? true,
  };
}

export async function loadModerationSection(userId: string): Promise<ModerationSectionData> {
  const events = await moderationRepository.findForUser(userId);
  return {
    events: events.map((event) => ({
      id: event.id,
      surface: event.surface,
      excerpt: event.excerpt,
      outcome: event.outcome,
      createdAt: event.createdAt.toISOString(),
      reviewedAt: event.reviewedAt?.toISOString() ?? null,
    })),
  };
}

/** No query: the sign-in identity is the session's own. */
export function accountSection(user: User): AccountSectionData {
  return { email: user.email ?? null, emailConfirmed: Boolean(user.email_confirmed_at) };
}

export async function loadDataSection(userId: string): Promise<DataSectionData> {
  const [activeToken, certificateCount] = await Promise.all([
    prisma.accountDeletionToken.findFirst({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { expiresAt: true },
    }),
    prisma.certificate.count({ where: { userId } }),
  ]);
  return {
    pendingExpiresAt: activeToken?.expiresAt.toISOString() ?? null,
    certificateCount,
  };
}

/** Every section, read in parallel: what the drawer opens with. */
export async function loadSettings(user: User): Promise<SettingsData> {
  const [profile, privacy, preferences, notifications, moderation, data] = await Promise.all([
    loadProfileSection(user.id),
    loadPrivacySection(user.id),
    loadPreferencesSection(user.id),
    loadNotificationsSection(user.id),
    loadModerationSection(user.id),
    loadDataSection(user.id),
  ]);
  return {
    profile,
    privacy,
    preferences,
    notifications,
    moderation,
    account: accountSection(user),
    data,
  };
}
