import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: "https://cyberlearn.fr",
    NEXT_PUBLIC_ADMIN_URL: "https://admin.cyberlearn.fr",
    RESEND_FROM_EMAIL: "noreply@cyberlearn.fr",
  },
}));

const { PRIVACY_CONTACT_EMAIL, securityContactUrl } = await import("../support-contact");

/**
 * Where a mail from the console tells its reader to write: a channel somebody
 * reads, never the noreply address the mail is sent from.
 */

describe("securityContactUrl", () => {
  it("opens the site's contact form on the security theme, subject filled in", () => {
    const url = new URL(securityContactUrl());
    expect(url.origin).toBe("https://cyberlearn.fr");
    expect(url.pathname).toBe("/contact");
    expect(url.searchParams.get("theme")).toBe("SECURITY");
    expect(url.searchParams.get("subject")).toBe("Double authentification retirée sans ma demande");
  });
});

describe("PRIVACY_CONTACT_EMAIL", () => {
  it("is the address the privacy policy publishes, not the sender", () => {
    expect(PRIVACY_CONTACT_EMAIL).toBe("privacy@cyberlearn.fr");
    expect(PRIVACY_CONTACT_EMAIL).not.toMatch(/noreply/u);
  });
});
