import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn<() => Promise<{ id: string }>>(),
  findSubject: vi.fn<(eventId: string) => Promise<unknown>>(),
  applyOutcome: vi.fn<(eventId: string, outcome: string, adminId: string) => Promise<unknown>>(),
  issue: vi.fn<(input: Record<string, unknown>) => Promise<{ ok: boolean }>>(),
  record: vi.fn<(entry: Record<string, unknown>) => Promise<void>>(),
  notificationCreate: vi.fn<(args: unknown) => Promise<unknown>>(),
  sendBanNoticeEmail: vi.fn<(options: unknown) => Promise<void>>(),
  sendModerationNoticeEmail: vi.fn<(options: unknown) => Promise<void>>(),
  revalidatePath: vi.fn<(path: string) => void>(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  moderationRepository: { findSubject: m.findSubject, applyOutcome: m.applyOutcome },
  banRepository: { issue: m.issue },
  auditLogRepository: { record: m.record },
  prisma: {
    notification: { create: m.notificationCreate },
  },
}));
vi.mock("@cyberlearn/email", () => ({
  sendBanNoticeEmail: m.sendBanNoticeEmail,
  sendModerationNoticeEmail: m.sendModerationNoticeEmail,
}));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: vi.fn() },
  errorMessage: (error: unknown) => String(error),
}));
vi.mock("@/lib/env", () => ({
  env: { RESEND_API_KEY: "re_test", RESEND_FROM_EMAIL: "noreply@cyberlearn.fr" },
}));
vi.mock("@/lib/learner-url", () => ({
  learnerUrl: (path: string) => `https://cyberlearn.fr${path}`,
  learnerSiteUrl: () => "https://cyberlearn.fr",
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

const { resolveModerationAction } = await import("../moderation-actions");

/**
 * A decision from the moderation queue: the account page's refusals apply to
 * its sanction too, and whatever did not go as asked comes back as a sentence
 * the queue can show once the row has gone.
 */

const ADMIN = "11111111-1111-4111-8111-111111111111";
const AUTHOR = "22222222-2222-4222-8222-222222222222";
const EVENT = "33333333-3333-4333-8333-333333333333";

function subject(id: string, role: "STUDENT" | "ADMIN") {
  return {
    id: EVENT,
    surface: "forum.post",
    excerpt: "un message",
    createdAt: new Date(),
    user: {
      id,
      email: "auteur@exemple.fr",
      displayName: "Auteur",
      username: "auteur",
      role,
      preferences: { emailNotifications: true },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: ADMIN });
  m.findSubject.mockResolvedValue(subject(AUTHOR, "STUDENT"));
  m.applyOutcome.mockResolvedValue({
    claimed: true,
    contentTouched: true,
    authorId: AUTHOR,
    surface: "forum.post",
  });
  m.issue.mockResolvedValue({ ok: true });
  m.record.mockResolvedValue(undefined);
  m.notificationCreate.mockResolvedValue({});
  m.sendBanNoticeEmail.mockResolvedValue(undefined);
  m.sendModerationNoticeEmail.mockResolvedValue(undefined);
});

describe("the sanction's guards", () => {
  it("bans a learner the moderator chose to sanction", async () => {
    await expect(resolveModerationAction(EVENT, "UPHELD", "7d")).resolves.toEqual({ ok: true });
    expect(m.issue).toHaveBeenCalledWith(expect.objectContaining({ userId: AUTHOR }));
  });

  it("refuses to ban an administrator, and decides nothing", async () => {
    m.findSubject.mockResolvedValue(subject(AUTHOR, "ADMIN"));
    const result = await resolveModerationAction(EVENT, "UPHELD", "7d");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/rôle administrateur/u);
    expect(m.applyOutcome).not.toHaveBeenCalled();
    expect(m.issue).not.toHaveBeenCalled();
  });

  it("refuses to let a moderator ban themselves", async () => {
    m.findSubject.mockResolvedValue(subject(ADMIN, "ADMIN"));
    const result = await resolveModerationAction(EVENT, "UPHELD", "permanent");
    expect(result.message).toMatch(/toi-même/u);
    expect(m.applyOutcome).not.toHaveBeenCalled();
  });

  it("still decides on an administrator's content when no sanction is asked", async () => {
    m.findSubject.mockResolvedValue(subject(AUTHOR, "ADMIN"));
    await expect(resolveModerationAction(EVENT, "UPHELD", "none")).resolves.toEqual({ ok: true });
    expect(m.applyOutcome).toHaveBeenCalled();
    expect(m.issue).not.toHaveBeenCalled();
  });
});

describe("what the queue is told", () => {
  it("that somebody else decided first, and the row is read again", async () => {
    m.applyOutcome.mockResolvedValue({
      claimed: false,
      contentTouched: false,
      authorId: null,
      surface: null,
    });
    const result = await resolveModerationAction(EVENT, "OVERTURNED");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/quelqu'un d'autre/u);
    expect(m.revalidatePath).toHaveBeenCalledWith("/moderation");
    expect(m.record).not.toHaveBeenCalled();
  });

  it("that the sanction did not apply to an account already banned", async () => {
    m.issue.mockResolvedValue({ ok: false });
    const result = await resolveModerationAction(EVENT, "UPHELD", "24h");
    expect(result).toMatchObject({ ok: true });
    expect(result.message).toMatch(/déjà banni/u);
  });

  it("that the ban went through but its e-mail did not", async () => {
    m.sendBanNoticeEmail.mockRejectedValue(new Error("resend down"));
    const result = await resolveModerationAction(EVENT, "UPHELD", "30d");
    expect(result).toMatchObject({ ok: true });
    expect(result.message).toMatch(/e-mail de bannissement/u);
  });
});
