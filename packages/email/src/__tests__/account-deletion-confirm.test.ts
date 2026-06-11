/**
 * Tests for AccountDeletionConfirmEmail template.
 * Verifies the rendered HTML contains the required elements.
 */

import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { AccountDeletionConfirmEmail } from "../templates/account-deletion-confirm.js";

const CONFIRM_URL =
  "https://cyberlearn.app/api/me/delete/confirm?token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

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
});
