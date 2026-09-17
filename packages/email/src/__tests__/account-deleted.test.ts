/**
 * Tests for AccountDeletedEmail.
 *
 * This one reports a decision already taken, so what matters is not that a
 * link works but that the message is true: no way back into a product the
 * person can no longer reach, no motive invented when none was given, and a
 * plain statement of what survived the erasure.
 */

import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { AccountDeletedEmail } from "../templates/account-deleted.js";

const BASE = {
  displayName: "Alice",
  deletedAt: "16 septembre 2026 à 14:32",
  contactEmail: "privacy@cyberlearn.fr",
};

describe("AccountDeletedEmail - rendered HTML", () => {
  it("greets the person and states when it happened", async () => {
    const html = await render(AccountDeletedEmail(BASE));
    expect(html).toContain("Alice");
    expect(html).toContain("16 septembre 2026");
  });

  it("says an administrator did it, not the person themselves", async () => {
    const html = await render(AccountDeletedEmail(BASE));
    expect(html).toContain("administrateur");
  });

  it("gives an address to reply to", async () => {
    const html = await render(AccountDeletedEmail(BASE));
    expect(html).toContain("privacy@cyberlearn.fr");
    expect(html).toContain("mailto:privacy@cyberlearn.fr");
  });

  it("shows the reason when one was given", async () => {
    const html = await render(AccountDeletedEmail({ ...BASE, reason: "Compte de démonstration" }));
    expect(html).toContain("Compte de démonstration");
    expect(html).toContain("Motif indiqué");
  });

  it("invents no reason when none was given", async () => {
    // An empty string is what an untouched optional form field sends, and it
    // must read the same as the field never existing.
    for (const reason of [undefined, ""]) {
      const html = await render(AccountDeletedEmail({ ...BASE, reason }));
      expect(html).not.toContain("Motif indiqué");
    }
  });

  it("says the published questions and answers stay, detached from the name", async () => {
    // The one thing deletion does not erase. Better read here than discovered
    // by finding your old question still online.
    const html = await render(AccountDeletedEmail(BASE));
    expect(html).toContain("questions et réponses");
  });

  it("offers no way back into an account that no longer exists", async () => {
    // No button, and no link anywhere except the mailto - every other href
    // would lead to a sign-in the person can no longer pass.
    const html = await render(AccountDeletedEmail(BASE));
    const hrefs = [...html.matchAll(/href="([^"]*)"/gu)].map((m) => m[1] ?? "");
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href.startsWith("mailto:")).toBe(true);
    }
  });
});
