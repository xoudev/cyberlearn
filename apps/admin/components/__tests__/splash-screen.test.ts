import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminSplashScreen } from "../splash-screen";

/**
 * The console splash, checked on the HTML the server actually sends.
 *
 * Same guard as the site's: the defect it replaces was invisible in the
 * component and only showed up in the delivered document, where the overlay
 * was simply not there.
 */

function html(): string {
  return renderToStaticMarkup(AdminSplashScreen());
}

/**
 * The first <script> element, split into its opening tag and its body.
 *
 * Deliberately not a regular expression. CodeQL reported three different ways
 * the obvious regex diverged from HTML (js/bad-tag-filter): it missed
 * <SCRIPT>, and once that was fixed, it missed an end tag written
 * `</script >`. Both reports were right, and a third would have been too -
 * chasing them one at a time is the losing half of the game. A regex is not an
 * HTML parser, which is the rule's actual point, so this walks indices
 * instead: the search runs on a lower-cased copy so case never matters, and
 * the end tag is found by its name rather than by a shape it has to match
 * exactly.
 */
function scriptParts(rendered: string): { tag: string; body: string } {
  const hay = rendered.toLowerCase();
  const start = hay.indexOf("<script");
  if (start < 0) return { tag: "", body: "" };
  const tagEnd = hay.indexOf(">", start);
  const close = hay.indexOf("</script", tagEnd);
  return {
    tag: rendered.slice(start, tagEnd + 1),
    body: rendered.slice(tagEnd + 1, close < 0 ? undefined : close),
  };
}

describe("the console splash is in the first frame", () => {
  it("renders the overlay unconditionally, with no effect to wait for", () => {
    expect(html()).toContain('data-splash="true"');
  });

  it("puts the once-per-session check ahead of the overlay", () => {
    const rendered = html();
    const script = rendered.indexOf("<script");
    expect(script).toBeGreaterThanOrEqual(0);
    expect(rendered.indexOf('data-splash="true"')).toBeGreaterThan(script);
  });

  it("leaves the script parser-blocking", () => {
    expect(scriptParts(html()).tag).not.toMatch(/\b(?:src|async|defer)\b/u);
  });

  it("keeps its own session key, so the two splashes do not silence each other", () => {
    // The console and the site are different origins today, but the key says
    // which splash it is either way - and if they ever share one, one visit to
    // the site must not suppress the console's.
    expect(html()).toContain("cl-admin-splash-shown");
  });

  it("keeps the key out of the script source", () => {
    // See the site's copy: interpolating the key into the script body builds a
    // program out of a string. (This was not what CodeQL reported on that PR -
    // that was js/bad-tag-filter, in this file's own regexes - but the habit is
    // worth not having either way.)
    const { body } = scriptParts(html());
    expect(body).not.toContain("cl-admin-splash-shown");
    expect(body).toContain("dataset.splashKey");
  });

  it("uses sessionStorage, so the animation returns with a new tab", () => {
    const rendered = html();
    expect(rendered).toContain("sessionStorage");
    expect(rendered).not.toContain("localStorage");
  });
});
