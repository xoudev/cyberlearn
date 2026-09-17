/**
 * Reading Sentry's issue list.
 *
 * Three of these tests are about failure, because failure is what this code is
 * mostly for: a monitor that reports "all clear" when it could not reach the
 * monitoring is worse than no monitor. The distinction between unconfigured,
 * refused and empty has to survive, so it is what is asserted.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { envMock } = vi.hoisted(() => ({
  envMock: {
    SENTRY_ORG: "cyberlearn" as string | undefined,
    SENTRY_PROJECT: "web" as string | undefined,
    SENTRY_AUTH_TOKEN: "tok" as string | undefined,
  },
}));
vi.mock("@/lib/env", () => ({ env: envMock }));

const { fetchSentryIssues } = await import("../sentry-issues");

const RAW = [
  {
    id: "42",
    title: "TypeError: cannot read x of undefined",
    culprit: "app/(app)/lessons/[slug]/page",
    level: "error",
    // Sentry sends the event count as a string and the user count as a number.
    count: "137",
    userCount: 12,
    lastSeen: new Date().toISOString(),
    permalink: "https://sentry.io/organizations/cyberlearn/issues/42/",
  },
];

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
      }),
    ),
  );
}

describe("fetchSentryIssues", () => {
  beforeEach(() => {
    envMock.SENTRY_ORG = "cyberlearn";
    envMock.SENTRY_PROJECT = "web";
    envMock.SENTRY_AUTH_TOKEN = "tok";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the issues, coercing Sentry's string counts", async () => {
    mockFetch(200, RAW);
    const result = await fetchSentryIssues();

    expect(result.state).toBe("ok");
    if (result.state !== "ok") return;
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.count).toBe(137);
    expect(result.issues[0]?.userCount).toBe(12);
    expect(result.issues[0]?.title).toContain("TypeError");
  });

  it("says it is unconfigured rather than pretending there are no errors", async () => {
    envMock.SENTRY_AUTH_TOKEN = undefined;
    expect((await fetchSentryIssues()).state).toBe("unconfigured");
  });

  it("names the missing scope when the token is refused", async () => {
    // The likely case: the token exists because the build uploads source maps
    // with it, and that scope does not include reading issues.
    mockFetch(403, {});
    const result = await fetchSentryIssues();

    expect(result.state).toBe("error");
    if (result.state !== "error") return;
    expect(result.reason).toContain("project:read");
  });

  it("reports any other Sentry failure rather than swallowing it", async () => {
    mockFetch(500, {});
    const result = await fetchSentryIssues();
    expect(result.state).toBe("error");
    if (result.state !== "error") return;
    expect(result.reason).toContain("500");
  });

  it("treats an unexpected shape as an error, not as an empty list", async () => {
    mockFetch(200, { detail: "nope" });
    expect((await fetchSentryIssues()).state).toBe("error");
  });

  it("distinguishes a genuine all-clear from every failure above", async () => {
    mockFetch(200, []);
    const result = await fetchSentryIssues();
    expect(result.state).toBe("ok");
    if (result.state !== "ok") return;
    expect(result.issues).toEqual([]);
  });
});
