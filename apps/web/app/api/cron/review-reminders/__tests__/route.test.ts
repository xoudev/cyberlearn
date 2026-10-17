import { beforeEach, describe, expect, it, vi } from "vitest";

/** GET /api/cron/review-reminders: one reminder a day, opening the day's recall. */

const m = vi.hoisted(() => ({
  isAuthorizedCron: vi.fn<(r: Request) => boolean>(),
  findReminders: vi.fn<(now: Date) => Promise<string[]>>(),
  learnersWithRecall: vi.fn<(userIds: readonly string[], now: Date) => Promise<string[]>>(),
  findMany: vi.fn(),
  create:
    vi.fn<
      (notice: {
        userId: string;
        type: string;
        title: string;
        body: string;
        actionUrl: string;
      }) => Promise<unknown>
    >(),
  logError: vi.fn(),
}));

vi.mock("@/lib/cron-auth", () => ({ isAuthorizedCron: m.isAuthorizedCron }));
vi.mock("@cyberlearn/db", () => ({
  prisma: { notification: { findMany: m.findMany } },
  notificationRepository: { create: m.create },
  reviewCardRepository: { findReminders: m.findReminders },
}));
vi.mock("@cyberlearn/lib/logger", () => ({
  errorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));
vi.mock("@/lib/revisions/daily-recall", () => ({ learnersWithRecall: m.learnersWithRecall }));
vi.mock("@/lib/request-logger", () => ({
  requestLogger: () => Promise.resolve({ error: m.logError }),
}));

const { GET } = await import("../route");

const request = (): Request => new Request("https://cyberlearn.fr/api/cron/review-reminders");

beforeEach(() => {
  vi.clearAllMocks();
  m.isAuthorizedCron.mockReturnValue(true);
  m.findMany.mockResolvedValue([]);
  m.create.mockResolvedValue({});
  m.learnersWithRecall.mockImplementation((userIds) => Promise.resolve([...userIds]));
});

describe("GET /api/cron/review-reminders", () => {
  it("refuses a caller without the cron secret", async () => {
    m.isAuthorizedCron.mockReturnValue(false);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(m.findReminders).not.toHaveBeenCalled();
  });

  it("reads the readers to remind off the review cards", async () => {
    m.findReminders.mockResolvedValue([]);
    const res = await GET(request());
    expect(await res.json()).toEqual({ ok: true, sent: 0 });
    expect(m.findReminders).toHaveBeenCalledWith(expect.any(Date));
  });

  it("opens the day's recall over the dashboard, and says no number", async () => {
    m.findReminders.mockResolvedValue(["u1", "u2"]);

    const res = await GET(request());

    expect(await res.json()).toEqual({ ok: true, sent: 2, failed: 0, skipped: 0 });
    expect(m.create).toHaveBeenCalledTimes(2);
    for (const [notice] of m.create.mock.calls) {
      expect(notice).toEqual(
        expect.objectContaining({
          type: "REVIEW_REMINDER",
          title: "Ton rappel du jour est prêt",
          actionUrl: "/dashboard?rappel=1",
        }),
      );
      expect(`${notice.title} ${notice.body}`).not.toMatch(/\d/u);
      expect(notice.body).not.toMatch(/leçons à réviser/u);
    }
  });

  it("reminds nobody whose day's recall has no question to ask", async () => {
    // u2's only card due is in a lesson that yields no quiz now.
    m.findReminders.mockResolvedValue(["u1", "u2"]);
    m.learnersWithRecall.mockResolvedValue(["u1"]);

    const res = await GET(request());

    expect(m.learnersWithRecall).toHaveBeenCalledWith(["u1", "u2"], expect.any(Date));
    expect(await res.json()).toEqual({ ok: true, sent: 1, failed: 0, skipped: 0 });
    expect(m.create).toHaveBeenCalledTimes(1);
    expect(m.create.mock.calls[0]?.[0]).toMatchObject({ userId: "u1" });
  });

  it("skips somebody already reminded today", async () => {
    m.findReminders.mockResolvedValue(["u1"]);
    m.findMany.mockResolvedValue([{ userId: "u1" }]);

    const res = await GET(request());

    expect(await res.json()).toEqual({ ok: true, sent: 0, failed: 0, skipped: 1 });
    expect(m.create).not.toHaveBeenCalled();
  });

  it("goes on past a reminder that fails, and counts it", async () => {
    m.findReminders.mockResolvedValue(["u1", "u2"]);
    m.create.mockRejectedValueOnce(new Error("boom"));

    const res = await GET(request());

    expect(await res.json()).toEqual({ ok: true, sent: 1, failed: 1, skipped: 0 });
    expect(m.logError).toHaveBeenCalledTimes(1);
  });
});
