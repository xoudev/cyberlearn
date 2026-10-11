/**
 * Tests for MfaResetEmail.
 *
 * The reader is either the owner who lost a phone, or the owner of an account
 * somebody else talked support into unlocking. The mail has to serve both: the
 * way to put the lock back, and the alarm to raise if they asked for nothing.
 */

import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { MfaResetEmail, mfaResetSubject } from "../templates/mfa-reset.js";

const BASE = {
  displayName: "Alice",
  resetAt: "12 octobre 2026 à 10:42",
  securityUrl: "https://cyberlearn.fr/settings/account",
  sessionsClosed: true,
  contactEmail: "contact@cyberlearn.fr",
  siteUrl: "https://cyberlearn.fr",
};

describe("MfaResetEmail - rendered HTML", () => {
  it("greets the person and says when it happened", async () => {
    const html = await render(MfaResetEmail(BASE));
    expect(html).toContain("Alice");
    expect(html).toContain("12 octobre 2026 à 10:42");
  });

  it("says the team did it, not the person", async () => {
    const html = await render(MfaResetEmail(BASE));
    expect(html).toContain("équipe CyberLearn a retiré la double authentification");
  });

  it("does not assume a password, which a GitHub account does not have", async () => {
    const html = await render(MfaResetEmail(BASE));
    expect(html).toContain("habitude, sans code");
    expect(html).not.toContain("ton adresse et ton mot de passe");
    expect(html).toContain("compte GitHub");
  });

  it("puts the lock back in one click, on the site's security settings", async () => {
    const html = await render(MfaResetEmail(BASE));
    expect(html).toContain('href="https://cyberlearn.fr/settings/account"');
    expect(html).toContain("Réactiver la double authentification");
  });

  it("tells somebody who asked for nothing what to do, and where to write", async () => {
    const html = await render(MfaResetEmail(BASE));
    expect(html).toContain("rien demandé");
    expect(html).toContain("Change ton mot de passe");
    expect(html).toContain("mailto:contact@cyberlearn.fr");
  });

  it("explains the sign-out only when sessions were really closed", async () => {
    expect(await render(MfaResetEmail(BASE))).toContain("appareils connectés ont été déconnectés");
    expect(await render(MfaResetEmail({ ...BASE, sessionsClosed: false }))).not.toContain(
      "déconnectés",
    );
  });

  it("carries no sign-in link: its only links are the settings, the site and the contact", async () => {
    const html = await render(MfaResetEmail(BASE));
    const hrefs = [...html.matchAll(/href="([^"]*)"/gu)].map((m) => m[1] ?? "");
    for (const href of hrefs) {
      expect([BASE.securityUrl, BASE.siteUrl, `mailto:${BASE.contactEmail}`]).toContain(href);
    }
  });
});

describe("mfaResetSubject", () => {
  const AT = new Date("2026-10-12T08:42:00Z"); // 10:42 in Paris

  it("stamps the moment, so a second reset never hides under the first", () => {
    expect(mfaResetSubject(AT)).toBe(
      "Ta double authentification a été réinitialisée · 12 oct. à 10:42",
    );
    expect(mfaResetSubject(AT)).not.toBe(mfaResetSubject(new Date("2026-10-12T08:43:00Z")));
  });

  it("never carries a code", () => {
    expect(mfaResetSubject(AT)).not.toMatch(/\d{6}/u);
  });
});
