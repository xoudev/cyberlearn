/**
 * Tests for MagicLinkEmail's code.
 *
 * The auth hook hands over a code with every mail, but the app takes one on a
 * single screen: "Mot de passe oublié". A sign-up confirmation used to show it
 * too, telling a new learner to type it "dans l'app mobile", where nothing
 * accepts it.
 */

import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { MagicLinkEmail, showsCode } from "../templates/magic-link.js";

const LINK = "https://cyberlearn.fr/auth/confirm?token_hash=x&type=signup";
const CODE = "483920";

describe("MagicLinkEmail - the code", () => {
  it("shows it on a password recovery, for the app", async () => {
    const html = await render(MagicLinkEmail({ magicLink: LINK, type: "recovery", code: CODE }));
    expect(html).toContain(CODE);
    expect(html).toContain("app mobile");
  });

  it("leaves it out of the sign-up confirmation, which only the link completes", async () => {
    const html = await render(MagicLinkEmail({ magicLink: LINK, type: "signup", code: CODE }));
    expect(html).not.toContain(CODE);
    expect(html).not.toContain("app mobile");
    expect(html).toContain("Confirmer mon compte");
  });

  it.each(["magiclink", "invite", "email_change"] as const)(
    "leaves it out of a %s mail too",
    async (type) => {
      const html = await render(MagicLinkEmail({ magicLink: LINK, type, code: CODE }));
      expect(html).not.toContain(CODE);
    },
  );
});

describe("showsCode", () => {
  it("is true for a recovery that carries a code, and nothing else", () => {
    expect(showsCode("recovery", CODE)).toBe(true);
    expect(showsCode("recovery", undefined)).toBe(false);
    expect(showsCode("recovery", "")).toBe(false);
    expect(showsCode("signup", CODE)).toBe(false);
  });
});
