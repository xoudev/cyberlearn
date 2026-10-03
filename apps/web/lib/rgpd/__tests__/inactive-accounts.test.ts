/**
 * Unit tests for one night of the inactive-accounts job.
 *
 * The rule that matters: nobody is erased on a notice they did not get. A
 * notice is recorded only once its mail has left; an erasure that fails does
 * not stop the others; the keep link in the mail is the one whose hash is
 * stored.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, mockSend } = vi.hoisted(() => ({
  db: {
    deleteAccount: vi.fn(),
    erasureDate: vi.fn(),
    findAccountsToErase: vi.fn(),
    findAccountsToWarn: vi.fn(),
    recordInactivityNotice: vi.fn(),
  },
  mockSend: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => db);
vi.mock("@cyberlearn/email", () => ({ sendInactivityNoticeEmail: mockSend }));
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: "https://cyberlearn.fr",
    RESEND_API_KEY: "re_test",
    RESEND_FROM_EMAIL: "noreply@cyberlearn.fr",
  },
}));

import { hashKeepToken } from "../keep-token";
import { ERASURES_PER_RUN, NOTICES_PER_RUN, runInactiveAccounts } from "../inactive-accounts";

const NOW = new Date("2026-10-03T02:00:00.000Z");
const ALICE = { id: "a", email: "alice@example.com", displayName: "Alice" };
const BOB = { id: "b", email: "bob@example.com", displayName: "Bob" };

beforeEach(() => {
  vi.clearAllMocks();
  db.findAccountsToErase.mockResolvedValue([]);
  db.findAccountsToWarn.mockResolvedValue([]);
  db.erasureDate.mockReturnValue(new Date("2026-11-02T02:00:00.000Z"));
  db.deleteAccount.mockResolvedValue({});
  db.recordInactivityNotice.mockResolvedValue(undefined);
  mockSend.mockResolvedValue(undefined);
});

describe("erasures", () => {
  it("erases each account due, as an erasure for inactivity", async () => {
    db.findAccountsToErase.mockResolvedValue([{ id: "x" }, { id: "y" }]);

    const summary = await runInactiveAccounts(NOW);

    expect(db.findAccountsToErase).toHaveBeenCalledWith(NOW, ERASURES_PER_RUN);
    expect(db.deleteAccount).toHaveBeenCalledTimes(2);
    expect(db.deleteAccount).toHaveBeenCalledWith("x", {
      ip: "cron",
      userAgent: "cron/inactive-accounts",
      action: "user.account.erased_inactive",
    });
    expect(summary).toMatchObject({ erased: 2, erasureFailures: 0 });
  });

  it("goes on past an account that will not go", async () => {
    db.findAccountsToErase.mockResolvedValue([{ id: "x" }, { id: "y" }]);
    db.deleteAccount.mockRejectedValueOnce(new Error("boom"));

    const summary = await runInactiveAccounts(NOW);

    expect(db.deleteAccount).toHaveBeenCalledTimes(2);
    expect(summary).toMatchObject({ erased: 1, erasureFailures: 1 });
  });
});

describe("notices", () => {
  it("mails the date and a keep link, then stores that link's hash", async () => {
    db.findAccountsToWarn.mockResolvedValue([ALICE]);

    const summary = await runInactiveAccounts(NOW);

    expect(db.findAccountsToWarn).toHaveBeenCalledWith(NOW, NOTICES_PER_RUN);
    expect(mockSend).toHaveBeenCalledOnce();
    const mail = mockSend.mock.calls[0]?.[0] as {
      to: string;
      displayName: string;
      eraseOn: string;
      keepUrl: string;
    };
    expect(mail).toMatchObject({ to: "alice@example.com", displayName: "Alice" });
    expect(mail.eraseOn).toBe("2 novembre 2026");

    const token = new URL(mail.keepUrl).searchParams.get("token") ?? "";
    expect(mail.keepUrl.startsWith("https://cyberlearn.fr/account/keep?token=")).toBe(true);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(db.recordInactivityNotice).toHaveBeenCalledWith("a", NOW, hashKeepToken(token));
    expect(summary).toMatchObject({ warned: 1, noticeFailures: 0 });
  });

  it("records nothing for a mail that did not leave, and goes on", async () => {
    db.findAccountsToWarn.mockResolvedValue([ALICE, BOB]);
    mockSend.mockRejectedValueOnce(new Error("Resend error"));

    const summary = await runInactiveAccounts(NOW);

    expect(db.recordInactivityNotice).toHaveBeenCalledOnce();
    expect(db.recordInactivityNotice).toHaveBeenCalledWith("b", NOW, expect.any(String));
    expect(summary).toMatchObject({ warned: 1, noticeFailures: 1 });
  });

  it("counts a notice it could not record as failed", async () => {
    db.findAccountsToWarn.mockResolvedValue([ALICE]);
    db.recordInactivityNotice.mockRejectedValueOnce(new Error("db down"));

    await expect(runInactiveAccounts(NOW)).resolves.toMatchObject({
      warned: 0,
      noticeFailures: 1,
    });
  });

  it("gives every account its own link", async () => {
    db.findAccountsToWarn.mockResolvedValue([ALICE, BOB]);
    await runInactiveAccounts(NOW);
    const urls = mockSend.mock.calls.map((c) => (c[0] as { keepUrl: string }).keepUrl);
    expect(new Set(urls).size).toBe(2);
  });
});

it("erases before it warns, so a night's notices never wait on its erasures", async () => {
  const order: string[] = [];
  db.findAccountsToErase.mockImplementation(() => {
    order.push("erase");
    return Promise.resolve([]);
  });
  db.findAccountsToWarn.mockImplementation(() => {
    order.push("warn");
    return Promise.resolve([]);
  });
  await runInactiveAccounts(NOW);
  expect(order).toEqual(["erase", "warn"]);
});
