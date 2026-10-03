/**
 * Tests for InactivityNoticeEmail.
 *
 * Somebody reading this has not opened the site in two years. The mail has to
 * be understood on its own: when the account goes, what goes with it, and the
 * one click that stops it.
 */

import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { InactivityNoticeEmail, inactivityNoticeSubject } from "../templates/inactivity-notice.js";

const BASE = {
  displayName: "Alice",
  eraseOn: "2 novembre 2026",
  keepUrl: "https://cyberlearn.fr/account/keep?token=abc",
  siteUrl: "https://cyberlearn.fr",
};

describe("InactivityNoticeEmail - rendered HTML", () => {
  it("greets the person and says when the account goes", async () => {
    const html = await render(InactivityNoticeEmail(BASE));
    expect(html).toContain("Alice");
    expect(html).toContain("2 novembre 2026");
  });

  it("keeps the account in one click", async () => {
    const html = await render(InactivityNoticeEmail(BASE));
    expect(html).toContain('href="https://cyberlearn.fr/account/keep?token=abc"');
    expect(html).toContain("Garder mon compte");
  });

  it("says that signing in keeps it too, and that doing nothing lets it go", async () => {
    const html = await render(InactivityNoticeEmail(BASE));
    expect(html).toContain("Te connecter sur le site, ou finir une leçon, avant cette date");
    expect(html).toContain("tu n&#x27;as rien à faire");
  });

  it("says what survives: certificates and what was published, without the name", async () => {
    const html = await render(InactivityNoticeEmail(BASE));
    expect(html).toContain("certificats resteront vérifiables");
    expect(html).toContain("restera lisible sans ton nom");
  });
});

describe("inactivityNoticeSubject", () => {
  it("names the date, so that a later notice never hides under this one", () => {
    expect(inactivityNoticeSubject("2 novembre 2026")).toBe(
      "Ton compte CyberLearn sera supprimé le 2 novembre 2026",
    );
  });
});
