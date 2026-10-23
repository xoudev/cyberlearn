import { describe, expect, it } from "vitest";
import { TICKET_FORM_THEMES } from "../../tickets/tickets.js";
import {
  MFA_RECOURSE_HINT,
  MFA_RECOURSE_PATH,
  MFA_RECOURSE_PROMPT,
  MFA_RECOURSE_SUBJECT,
} from "../mfa-recourse.js";

describe("the way out of the second-factor screen", () => {
  const url = new URL(MFA_RECOURSE_PATH, "https://cyberlearn.fr");

  it("opens the contact form", () => {
    expect(url.pathname).toBe("/contact");
  });

  it("opens it on a theme the form offers", () => {
    // The form ignores a theme it does not know and leaves the select empty.
    const theme = url.searchParams.get("theme");
    expect(TICKET_FORM_THEMES.map((t) => t.value)).toContain(theme);
    expect(theme).toBe("SECURITY");
  });

  it("opens it with a subject the form accepts, whole after the round trip through the address", () => {
    const subject = url.searchParams.get("subject");
    expect(subject).toBe(MFA_RECOURSE_SUBJECT);
    // The form requires between 5 and 200 characters.
    expect(MFA_RECOURSE_SUBJECT.length).toBeGreaterThanOrEqual(5);
    expect(MFA_RECOURSE_SUBJECT.length).toBeLessThanOrEqual(200);
  });

  it("stays a path: it carries no origin of its own", () => {
    expect(MFA_RECOURSE_PATH.startsWith("/contact?")).toBe(true);
  });

  it("speaks to the reader as the rest of the learner site does", () => {
    for (const text of [MFA_RECOURSE_PROMPT, MFA_RECOURSE_HINT, MFA_RECOURSE_SUBJECT]) {
      // Tutoiement, and no vouvoiement slipped in.
      expect(text).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b/iu);
      // The typography check forbids the em dash in anything shipped.
      expect(text.includes(String.fromCharCode(0x2014))).toBe(false);
    }
    expect(MFA_RECOURSE_PROMPT.endsWith("?")).toBe(true);
  });
});
