import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cssBlock, cssValue } from "@/test/css";

/**
 * The "Afficher" button of a password field was 14px tall at 375px, a third of
 * the 44px a finger needs. Bastion keeps that touch target at every width and
 * reserves enough space in the field to keep the typed password uncovered.
 *
 * There is no layout in jsdom, so the stylesheet's rules are what is checked.
 */

const AUTH = path.resolve(__dirname, "../..");
const SHEET = readFileSync(path.join(AUTH, "_components", "auth-shell.module.css"), "utf8");

function required(body: string | undefined, what: string): string {
  if (body === undefined) throw new Error(`no ${what}`);
  return body;
}

describe("the password field's reveal button", () => {
  it("keeps a touch target at every width", () => {
    const base = required(cssBlock(SHEET, ".reveal"), ".reveal rule");
    expect(
      Number.parseFloat(required(cssValue(base, "min-height"), "minimum height")),
    ).toBeGreaterThanOrEqual(44);
    expect(
      Number.parseFloat(required(cssValue(base, "min-width"), "minimum width")),
    ).toBeGreaterThanOrEqual(44);
  });

  it("leaves the button's width and offset clear of the typed password", () => {
    const base = required(cssBlock(SHEET, ".reveal"), ".reveal rule");
    const field = required(cssBlock(SHEET, ".passwordInput"), ".passwordInput rule");
    const width = Number.parseFloat(required(cssValue(base, "min-width"), "minimum width"));
    const offset = Number.parseFloat(required(cssValue(base, "right"), "right offset"));
    expect(
      Number.parseFloat(required(cssValue(field, "padding-right"), "password clearance")),
    ).toBeGreaterThanOrEqual(width + offset);
  });

  it("is the one every password field of the sign-in screens uses", () => {
    for (const form of [
      "login/login-form.tsx",
      "register/register-form.tsx",
      "reset-password/reset-password-form.tsx",
    ]) {
      expect(readFileSync(path.join(AUTH, form), "utf8"), form).toContain(
        "className={styles.reveal}",
      );
    }
  });
});
