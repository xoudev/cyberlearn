/**
 * Tests for AccountDeletionConfirmEmail template.
 * Verifies the rendered HTML contains the required elements.
 */

import { render } from "@react-email/components";
import { describe, expect, it, vi } from "vitest";
import {
  AccountDeletionConfirmEmail,
  sendDeletionConfirmEmail,
} from "../templates/account-deletion-confirm.js";

// Only the subject is read off the send; nothing leaves the test.
const resend = vi.hoisted(() => ({
  send: vi.fn<(mail: { subject: string }) => Promise<{ error: null }>>(),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resend.send };
  },
}));

/** The register the site does not use: the deletion path says "tu" throughout. */
const FORMAL = /\b(?:vous|votre|vos|veuillez)\b/iu;

const CONFIRM_URL =
  "https://cyberlearn.fr/api/me/delete/confirm?token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("AccountDeletionConfirmEmail - rendered HTML", () => {
  it("contains the confirm button with the correct href", async () => {
    const html = await render(
      AccountDeletionConfirmEmail({ displayName: "Alice", confirmUrl: CONFIRM_URL }),
    );
    expect(html).toContain(CONFIRM_URL);
    expect(html).toContain("Confirmer la suppression");
  });

  it("greets the user by displayName", async () => {
    const html = await render(
      AccountDeletionConfirmEmail({ displayName: "Bob Dupont", confirmUrl: CONFIRM_URL }),
    );
    expect(html).toContain("Bob Dupont");
  });

  it("mentions the 1-hour expiry", async () => {
    const html = await render(
      AccountDeletionConfirmEmail({ displayName: "Alice", confirmUrl: CONFIRM_URL }),
    );
    expect(html).toContain("1 heure");
  });

  it("includes the privacy contact email in the footer", async () => {
    const html = await render(
      AccountDeletionConfirmEmail({ displayName: "Alice", confirmUrl: CONFIRM_URL }),
    );
    expect(html).toContain("privacy@cyberlearn.fr");
  });

  it("warns that the action is irréversible", async () => {
    const html = await render(
      AccountDeletionConfirmEmail({ displayName: "Alice", confirmUrl: CONFIRM_URL }),
    );
    expect(html).toContain("irr");
  });

  it("mentions certificate anonymous preservation", async () => {
    const html = await render(
      AccountDeletionConfirmEmail({ displayName: "Alice", confirmUrl: CONFIRM_URL }),
    );
    expect(html).toContain("certificats");
  });

  it("says tu, like the settings and the pages on either side of it", async () => {
    // The deletion path is read carefully: the settings and /account/delete
    // say "tu", so the mail between them saying "vous" read as somebody else.
    const html = await render(
      AccountDeletionConfirmEmail({ displayName: "Alice", confirmUrl: CONFIRM_URL }),
    );
    expect(html).toContain("Tu as demandé");
    expect(html).toContain("Confirme la suppression de ton compte");
    expect(html).not.toMatch(FORMAL);
  });
});

describe("sendDeletionConfirmEmail", () => {
  it("asks in the subject with tu too, stamped so each link is its own row", async () => {
    resend.send.mockResolvedValue({ error: null });

    await sendDeletionConfirmEmail({
      apiKey: "re_test",
      from: "Cyber Learn <noreply@cyberlearn.fr>",
      to: "alice@example.com",
      displayName: "Alice",
      confirmUrl: CONFIRM_URL,
    });

    const subject = resend.send.mock.calls[0]?.[0].subject ?? "";
    expect(subject).toMatch(/^Confirme la suppression de ton compte Cyber Learn · /u);
    expect(subject).not.toMatch(FORMAL);
  });
});
