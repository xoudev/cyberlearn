import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * On a 375px screen the user's page was 391px wide. The button that deletes the
 * account, "Supprimer ce compte et toutes ses données", inherited the console
 * button's `white-space: nowrap` and was 348px long in a form whose card ends
 * at 332, so the form pushed the page sideways. That button wraps; the other
 * buttons of the console stay on one line.
 *
 * There is no layout in this test environment, so the stylesheet's rules and
 * the form's markup are what is checked.
 */

const APP = join(__dirname, "..", "..", "..", "..", "..");
const css = readFileSync(join(APP, "admin-ui.css"), "utf8");
const form = readFileSync(join(__dirname, "..", "delete-user-form.tsx"), "utf8");

/** The declarations of the rule for a selector that opens a line, braces left out. */
function rule(selector: string): string {
  // Plain string search: a RegExp built from the selector is what Semgrep
  // flags (detect-non-literal-regexp), even in a test.
  const opening = `\n${selector} {`;
  const start = css.indexOf(opening);
  if (start === -1) throw new Error(`no ${selector} rule in admin-ui.css`);
  const body = start + opening.length;
  return css.slice(body, css.indexOf("}", body));
}

/** What a rule gives a property, or undefined. */
function value(declarations: string, property: string): string | undefined {
  for (const declaration of declarations.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon !== -1 && declaration.slice(0, colon).trim() === property) {
      return declaration.slice(colon + 1).trim();
    }
  }
  return undefined;
}

describe("the console's buttons", () => {
  it("keep their label on one line, as they always did", () => {
    expect(value(rule(".a-btn"), "white-space")).toBe("nowrap");
  });

  it("wrap when they are given the modifier, within the width of their form", () => {
    const wrap = rule(".a-btn--wrap");
    expect(value(wrap, "white-space")).toBe("normal");
    expect(value(wrap, "max-width")).toBe("100%");
  });

  it("read the modifier after the button's own rule, which it overrides", () => {
    expect(css.indexOf("\n.a-btn--wrap {")).toBeGreaterThan(css.indexOf("\n.a-btn {"));
  });

  it("stay on one line in every variant that does not ask for the modifier", () => {
    for (const variant of [".a-btn--primary", ".a-btn--ghost", ".a-btn--danger", ".a-btn--sm"]) {
      expect(value(rule(variant), "white-space"), variant).toBeUndefined();
    }
  });
});

describe("the form that deletes an account", () => {
  it("lets its long button wrap", () => {
    const button = /<button\b[^>]*className="([^"]*)"[^>]*>\s*\{pending \? "Suppression…"/u.exec(
      form,
    );
    expect(button?.[1]?.split(" ")).toEqual(
      expect.arrayContaining(["a-btn", "a-btn--danger", "a-btn--wrap"]),
    );
  });
});
