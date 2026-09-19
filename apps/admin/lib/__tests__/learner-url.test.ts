/**
 * The links the console sends to other people.
 *
 * Every one of them is read by a learner who has no business in the console, so
 * the case that matters is the misconfigured one: a deployment where the site
 * URL and the admin URL are the same address. That used to produce six mails a
 * recipient could not act on, with nothing anywhere saying so.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { envMock } = vi.hoisted(() => ({
  envMock: {
    NEXT_PUBLIC_SITE_URL: "https://cyberlearn.fr",
    NEXT_PUBLIC_ADMIN_URL: "https://admin.cyberlearn.fr",
  },
}));
vi.mock("@/lib/env", () => ({ env: envMock }));

const { isSelfReferential, learnerSiteUrl, learnerUrl } = await import("../learner-url");

beforeEach(() => {
  envMock.NEXT_PUBLIC_SITE_URL = "https://cyberlearn.fr";
  envMock.NEXT_PUBLIC_ADMIN_URL = "https://admin.cyberlearn.fr";
});

describe("telling the two sites apart", () => {
  it("accepts a subdomain as a different site", () => {
    expect(isSelfReferential("https://cyberlearn.fr", "https://admin.cyberlearn.fr")).toBe(false);
  });

  it("accepts two ports as different sites, the way local development runs", () => {
    expect(isSelfReferential("http://localhost:3000", "http://localhost:3001")).toBe(false);
  });

  it("catches the same address written differently", () => {
    // A trailing slash, a path, a repeated value: all the same origin, and all
    // the same mistake.
    expect(isSelfReferential("https://admin.cyberlearn.fr/", "https://admin.cyberlearn.fr")).toBe(
      true,
    );
    expect(
      isSelfReferential("https://admin.cyberlearn.fr/tickets", "https://admin.cyberlearn.fr"),
    ).toBe(true);
  });

  it("does not call an unparseable value a match", () => {
    expect(isSelfReferential("not a url", "https://admin.cyberlearn.fr")).toBe(false);
  });
});

describe("building a link for a learner", () => {
  it("hangs the path off the learner site", () => {
    expect(learnerUrl("/support/abc")).toBe("https://cyberlearn.fr/support/abc");
    expect(learnerSiteUrl()).toBe("https://cyberlearn.fr");
  });

  it("does not double the slash when the configured URL ends with one", () => {
    envMock.NEXT_PUBLIC_SITE_URL = "https://cyberlearn.fr/";
    expect(learnerUrl("/banned")).toBe("https://cyberlearn.fr/banned");
  });

  it("refuses to build a link to the console", () => {
    // The whole point. A thrown error stops the mail and is reported; a wrong
    // link is sent, looks fine, and is only discovered by whoever clicks it.
    envMock.NEXT_PUBLIC_SITE_URL = "https://admin.cyberlearn.fr";
    expect(() => learnerUrl("/support/abc")).toThrow(/admin console/u);
  });
});
