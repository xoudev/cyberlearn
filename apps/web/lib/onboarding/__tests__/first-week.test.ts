import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The first week's e-mails: who is due, what is said, and that a learner
 * already at work, a step already handled or an e-mail that failed is each
 * dealt with once.
 */

const m = vi.hoisted(() => ({
  dueForStep: vi.fn<(step: string, from: Date, to: Date, now: Date) => Promise<unknown[]>>(),
  claim: vi.fn<(userId: string, step: string, now: Date) => Promise<boolean>>(),
  release: vi.fn<(userId: string, step: string) => Promise<void>>(),
  firstDays:
    vi.fn<
      (userId: string) => Promise<{
        lessonsCompleted: number;
        lastCompletedAt: Date | null;
        xpTotal: number;
        streakDays: number;
      }>
    >(),
  nextLessonFor: vi.fn<(userId: string, xp: number) => Promise<unknown>>(),
  send: vi.fn<(input: Record<string, unknown>) => Promise<void>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  onboardingRepository: {
    dueForStep: m.dueForStep,
    claim: m.claim,
    release: m.release,
    firstDays: m.firstDays,
  },
}));
vi.mock("@cyberlearn/email", () => ({ sendFirstWeekEmail: m.send }));
vi.mock("@/lib/env", () => ({
  env: {
    RESEND_API_KEY: "re_test",
    RESEND_FROM_EMAIL: "equipe@cyberlearn.fr",
    NEXT_PUBLIC_SITE_URL: "https://cyberlearn.fr",
  },
}));
vi.mock("../next-lesson", () => ({ nextLessonFor: m.nextLessonFor }));

const { runFirstWeek, stepIsNeeded, stepWindow } = await import("../first-week");

const NOW = new Date("2026-11-26T09:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const ACCOUNT = { id: "u-1", email: "amelie@example.org", displayName: "Amélie" };
const LESSON = {
  slug: "introduction-injections-sql",
  title: "Introduction aux injections SQL",
  estimatedMinutes: 30,
  xpReward: 100,
};
const IDLE = { lessonsCompleted: 0, lastCompletedAt: null, xpTotal: 0, streakDays: 0 };

/** Only `step` has `account` due; the other steps have nobody. */
function due(step: string): void {
  m.dueForStep.mockImplementation((s) => Promise.resolve(s === step ? [ACCOUNT] : []));
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.claim.mockResolvedValue(true);
  m.release.mockResolvedValue(undefined);
  m.nextLessonFor.mockResolvedValue(LESSON);
  m.send.mockResolvedValue(undefined);
});

describe("stepWindow", () => {
  it("covers the accounts that signed up between N and N + 2 days ago", () => {
    const { from, to } = stepWindow(3, NOW);
    expect(NOW.getTime() - to.getTime()).toBe(3 * DAY);
    expect(NOW.getTime() - from.getTime()).toBe(5 * DAY);
  });
});

describe("stepIsNeeded", () => {
  it("sends day 1 only before the first lesson", () => {
    expect(stepIsNeeded("FIRST_MISSION", IDLE, NOW)).toBe(true);
    expect(stepIsNeeded("FIRST_MISSION", { ...IDLE, lessonsCompleted: 1 }, NOW)).toBe(false);
  });

  it("sends day 3 only after two days without a lesson", () => {
    expect(stepIsNeeded("COME_BACK", IDLE, NOW)).toBe(true);
    const yesterday = new Date(NOW.getTime() - DAY);
    const threeDaysAgo = new Date(NOW.getTime() - 3 * DAY);
    expect(
      stepIsNeeded("COME_BACK", { ...IDLE, lessonsCompleted: 2, lastCompletedAt: yesterday }, NOW),
    ).toBe(false);
    expect(
      stepIsNeeded(
        "COME_BACK",
        { ...IDLE, lessonsCompleted: 2, lastCompletedAt: threeDaysAgo },
        NOW,
      ),
    ).toBe(true);
  });

  it("always sends day 7", () => {
    expect(stepIsNeeded("FIRST_WEEK", { ...IDLE, lessonsCompleted: 9 }, NOW)).toBe(true);
  });
});

describe("runFirstWeek", () => {
  it("names the dashboard's mission in day 1, to the account's address", async () => {
    due("FIRST_MISSION");
    m.firstDays.mockResolvedValue(IDLE);
    expect(await runFirstWeek(NOW)).toEqual({ sent: 1, skipped: 0, failed: 0 });
    expect(m.claim).toHaveBeenCalledWith("u-1", "FIRST_MISSION", NOW);
    expect(m.send).toHaveBeenCalledWith({
      apiKey: "re_test",
      from: "equipe@cyberlearn.fr",
      to: "amelie@example.org",
      step: "FIRST_MISSION",
      displayName: "Amélie",
      lesson: {
        title: "Introduction aux injections SQL",
        minutes: 30,
        xp: 100,
        url: "https://cyberlearn.fr/lessons/introduction-injections-sql",
      },
      siteUrl: "https://cyberlearn.fr",
    });
  });

  it("asks each step for its own window", async () => {
    m.dueForStep.mockResolvedValue([]);
    await runFirstWeek(NOW);
    const asked = m.dueForStep.mock.calls.map(([step, from, to]) => [
      step,
      (NOW.getTime() - to.getTime()) / DAY,
      (NOW.getTime() - from.getTime()) / DAY,
    ]);
    expect(asked).toEqual([
      ["FIRST_MISSION", 1, 3],
      ["COME_BACK", 3, 5],
      ["FIRST_WEEK", 7, 9],
    ]);
  });

  it("leaves a learner already at work alone, and keeps the step handled", async () => {
    due("FIRST_MISSION");
    m.firstDays.mockResolvedValue({ ...IDLE, lessonsCompleted: 1 });
    expect(await runFirstWeek(NOW)).toEqual({ sent: 0, skipped: 1, failed: 0 });
    expect(m.send).not.toHaveBeenCalled();
    expect(m.release).not.toHaveBeenCalled();
  });

  it("sends nothing for a step another run already claimed", async () => {
    due("COME_BACK");
    m.claim.mockResolvedValue(false);
    expect(await runFirstWeek(NOW)).toEqual({ sent: 0, skipped: 0, failed: 0 });
    expect(m.firstDays).not.toHaveBeenCalled();
    expect(m.send).not.toHaveBeenCalled();
  });

  it("tells the week back on day 7", async () => {
    due("FIRST_WEEK");
    m.firstDays.mockResolvedValue({
      lessonsCompleted: 3,
      lastCompletedAt: NOW,
      xpTotal: 320,
      streakDays: 2,
    });
    await runFirstWeek(NOW);
    expect(m.send.mock.calls[0]?.[0]).toMatchObject({
      step: "FIRST_WEEK",
      tally: { lessons: 3, xp: 320, streakDays: 2 },
    });
  });

  it("sends to the paths when there is no lesson to name", async () => {
    due("FIRST_MISSION");
    m.firstDays.mockResolvedValue(IDLE);
    m.nextLessonFor.mockResolvedValue(null);
    await runFirstWeek(NOW);
    expect(m.send.mock.calls[0]?.[0]).toMatchObject({ lesson: null });
  });

  it("gives a failed e-mail back for the next run, and goes on with the others", async () => {
    m.dueForStep.mockImplementation((s) =>
      Promise.resolve(
        s === "FIRST_MISSION" ? [ACCOUNT, { ...ACCOUNT, id: "u-2", email: "b@example.org" }] : [],
      ),
    );
    m.firstDays.mockResolvedValue(IDLE);
    m.send.mockRejectedValueOnce(new Error("Resend error: down")).mockResolvedValueOnce(undefined);
    expect(await runFirstWeek(NOW)).toEqual({ sent: 1, skipped: 0, failed: 1 });
    expect(m.release).toHaveBeenCalledWith("u-1", "FIRST_MISSION");
    expect(m.send).toHaveBeenCalledTimes(2);
  });
});
