import { beforeEach, describe, expect, it, vi } from "vitest";

/** GET /api/cron/review-reminders: one reminder a day, opening the day's recall. */

const m = vi.hoisted(() => ({
  isAuthorizedCron: vi.fn<(r: Request) => boolean>(),
  findReminders: vi.fn<(now: Date) => Promise<string[]>>(),
  findMany: vi.fn(),
  create: vi.fn(),
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
      const { title, body } = notice as { title: string; body: string };
      expect(`${title} ${body}`).not.toMatch(/\d/u);
      expect(body).not.toMatch(/leçons à réviser/u);
    }
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
