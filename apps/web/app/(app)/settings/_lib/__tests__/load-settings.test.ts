import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The loaders the pages and the drawer share. What matters most: what they
 * return is what the drawer accepts, or the drawer would refuse every
 * payload and show its error instead of the settings.
 */

const { db, resolveAvatarSrc } = vi.hoisted(() => ({
  db: {
    prisma: {
      user: { findUnique: vi.fn() },
      userPreferences: { findUnique: vi.fn() },
      accountDeletionToken: { findFirst: vi.fn() },
      certificate: { count: vi.fn() },
    },
    moderationRepository: { findForUser: vi.fn() },
  },
  resolveAvatarSrc: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => db);
vi.mock("@/lib/avatar/storage", () => ({ resolveAvatarSrc }));

const { loadProfileSection, loadSettings } = await import("../load-settings");
const { settingsDataSchema } = await import("../settings-data");

function person(confirmed: boolean): User {
  return {
    id: "user-1",
    aud: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
    email: "ada@example.test",
    ...(confirmed && { email_confirmed_at: "2026-01-01T00:00:00Z" }),
  };
}
const USER = person(true);

beforeEach(() => {
  vi.clearAllMocks();
  db.prisma.user.findUnique.mockResolvedValue(null);
  db.prisma.userPreferences.findUnique.mockResolvedValue(null);
  db.prisma.accountDeletionToken.findFirst.mockResolvedValue(null);
  db.prisma.certificate.count.mockResolvedValue(0);
  db.moderationRepository.findForUser.mockResolvedValue([]);
});

describe("the settings loaders", () => {
  it("fall back to the defaults the pages always had when rows are missing", async () => {
    const settings = await loadSettings(person(false));
    expect(settings.profile).toEqual({
      username: "",
      displayName: "",
      bio: "",
      avatarUrl: "",
      avatarPreview: null,
    });
    expect(settings.privacy).toEqual({
      visibility: "ANONYMOUS",
      publicProfile: true,
      friendsLeaderboard: false,
    });
    expect(settings.preferences).toEqual({ spacedRepetition: true });
    expect(Object.values(settings.notifications).every(Boolean)).toBe(true);
    expect(settings.account).toEqual({ email: "ada@example.test", emailConfirmed: false });
    expect(settings.data).toEqual({ pendingExpiresAt: null, certificateCount: 0 });
  });

  it("sign an uploaded photo for its preview, and only an uploaded one", async () => {
    db.prisma.user.findUnique.mockResolvedValueOnce({
      username: "ada",
      displayName: "Ada",
      bio: null,
      avatarUrl: "__upload:user-1/a.webp",
    });
    resolveAvatarSrc.mockResolvedValueOnce("https://storage.example/signed");
    expect((await loadProfileSection("user-1")).avatarPreview).toBe(
      "https://storage.example/signed",
    );

    db.prisma.user.findUnique.mockResolvedValueOnce({
      username: "ada",
      displayName: "Ada",
      bio: "",
      avatarUrl: "/avatars/03.png",
    });
    expect((await loadProfileSection("user-1")).avatarPreview).toBeNull();
    expect(resolveAvatarSrc).toHaveBeenCalledTimes(1);
  });

  it("return what the drawer accepts, dates as strings", async () => {
    db.prisma.user.findUnique.mockResolvedValue({
      username: "ada",
      displayName: "Ada",
      bio: "Hello",
      avatarUrl: "/avatars/01.png",
    });
    db.prisma.userPreferences.findUnique.mockResolvedValue({
      leaderboardVisibility: "PUBLIC",
      publicProfile: false,
      friendsLeaderboard: true,
      spacedRepetition: false,
      reviewReminders: false,
      weeklyDigest: true,
      streakReminder: false,
      emailNotifications: true,
    });
    db.moderationRepository.findForUser.mockResolvedValue([
      {
        id: "e1",
        surface: "FORUM_ANSWER",
        excerpt: "extrait",
        outcome: "UPHELD",
        createdAt: new Date("2026-03-04T09:30:00Z"),
        reviewedAt: null,
      },
    ]);
    db.prisma.accountDeletionToken.findFirst.mockResolvedValue({
      expiresAt: new Date("2026-10-06T12:00:00Z"),
    });
    db.prisma.certificate.count.mockResolvedValue(2);

    const settings = await loadSettings(USER);
    const parsed = settingsDataSchema.safeParse(JSON.parse(JSON.stringify(settings)));
    expect(parsed.success).toBe(true);
    expect(settings.moderation.events[0]?.createdAt).toBe("2026-03-04T09:30:00.000Z");
    expect(settings.data).toEqual({
      pendingExpiresAt: "2026-10-06T12:00:00.000Z",
      certificateCount: 2,
    });
    expect(settings.privacy.visibility).toBe("PUBLIC");
    expect(settings.account.emailConfirmed).toBe(true);
  });

  it("read the caller's rows only", async () => {
    await loadSettings(USER);
    expect(db.prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } }),
    );
    for (const call of db.prisma.userPreferences.findUnique.mock.calls) {
      expect(call[0]).toMatchObject({ where: { userId: "user-1" } });
    }
    expect(db.moderationRepository.findForUser).toHaveBeenCalledWith("user-1");
    expect(db.prisma.certificate.count).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });
});
