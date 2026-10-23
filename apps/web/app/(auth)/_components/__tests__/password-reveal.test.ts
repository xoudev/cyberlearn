import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cssBlock, cssValue, mediaRule } from "@/test/css";

/**
 * The "Afficher" button of a password field was 14px tall at 375px, a third of
 * the 44px a finger needs, on the screen where a phone's keyboard hides the
 * field and the word is the only way to check what was typed. On a phone it is
 * 44px tall now; from 768px up nothing changes.
 *
 * There is no layout in jsdom, so the stylesheet's rules are what is checked.
 */

const AUTH = path.resolve(__dirname, "../..");
const SHEET = readFileSync(path.join(AUTH, "_components", "auth-shell.module.css"), "utf8");
const PHONE = "(max-width: 767px)";

function required(body: string | undefined, what: string): string {
  if (body === undefined) throw new Error(`no ${what}`);
  return body;
}

describe("the password field's reveal button", () => {
  it("keeps its look from 768px up: the word, 12px in from the field's edge", () => {
    const base = required(cssBlock(SHEET, ".reveal"), ".reveal rule");
    expect(cssValue(base, "right")).toBe("12px");
    expect(cssValue(base, "font-size")).toBe("9px");
    expect(cssValue(base, "min-height")).toBeUndefined();
    expect(cssValue(base, "padding")).toBeUndefined();
  });

  it("is a 44px touch target below 768px", () => {
    const phone = required(mediaRule(SHEET, PHONE, ".reveal"), ".reveal phone rule");
    expect(cssValue(phone, "min-height")).toBe("44px");
    expect(cssValue(phone, "min-width")).toBe("44px");
  });

  it("keeps the word where it was on a phone: the padding takes the offset's place", () => {
    const phone = required(mediaRule(SHEET, PHONE, ".reveal"), ".reveal phone rule");
    // 12px in from the edge plus the 6px of a button's own padding.
    expect(cssValue(phone, "right")).toBe("0");
    expect(cssValue(phone, "padding")).toBe("0 18px 0 8px");
  });

  it("does not cover what is typed: the field still keeps 76px free for the button", () => {
    // 8px + the word (about 50px for "Afficher") + 18px is 76px: the button's
    // left edge falls where the field's text must stop.
    const field = required(cssBlock(SHEET, ".passwordInput"), ".passwordInput rule");
    expect(cssValue(field, "padding-right")).toBe("76px");
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
