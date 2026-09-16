/**
 * Tests for ClassInvitationEmail.
 *
 * The claim this template makes is that it carries no secret: the invitation is
 * bound to the address, and the link is the ordinary sign-up page. That is what
 * makes forwarding it harmless, so it is what is asserted here.
 */

import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { ClassInvitationEmail } from "../templates/class-invitation.js";

const BASE = {
  className: "SIO1-A",
  establishmentName: "Lycée Jean Moulin",
  promotionName: "BTS SIO 2025-2026",
  email: "eleve@ecole.fr",
  expiresAt: "16 octobre 2026",
  signUpUrl: "https://cyberlearn.fr/register",
};

describe("ClassInvitationEmail - rendered HTML", () => {
  it("names the class, the school and the intake", async () => {
    const html = await render(ClassInvitationEmail(BASE));
    expect(html).toContain("SIO1-A");
    expect(html).toContain("Lycée Jean Moulin");
    expect(html).toContain("BTS SIO 2025-2026");
  });

  it("states the address the invitation is bound to", async () => {
    // It is the key, not a greeting: signing up with a different address takes
    // nothing, and the reader has to know which one to use.
    const html = await render(ClassInvitationEmail(BASE));
    expect(html).toContain("eleve@ecole.fr");
  });

  it("carries no token: every link is the plain sign-up page", async () => {
    const html = await render(ClassInvitationEmail(BASE));
    const hrefs = [...html.matchAll(/href="([^"]*)"/gu)].map((m) => m[1] ?? "");

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).toBe(BASE.signUpUrl);
      // No query string at all - that is where a token would hide.
      expect(href).not.toContain("?");
    }
  });

  it("gives the expiry", async () => {
    const html = await render(ClassInvitationEmail(BASE));
    expect(html).toContain("16 octobre 2026");
  });

  it("tells a stranger they can ignore it", async () => {
    // A mail naming a school the reader has never heard of is otherwise
    // alarming, and the honest answer is that doing nothing is enough.
    const html = await render(ClassInvitationEmail(BASE));
    expect(html).toContain("Ignore ce message");
  });
});
