import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SplashScreen } from "../splash-screen";

/**
 * The splash, checked on the HTML the server actually sends.
 *
 * The bug this guards against did not look like a bug in the component: the
 * component was fine, it simply rendered null until an effect had run. The
 * consequence only showed up one layer out - the overlay was missing from the
 * delivered document, so the browser painted the page first and the "loading"
 * screen arrived afterwards and covered it.
 *
 * So these assert on the rendered string, not on the element tree: what the
 * browser is handed, in the order it parses it.
 */

function html(nonce?: string): string {
  return renderToStaticMarkup(SplashScreen(nonce === undefined ? {} : { nonce }));
}

describe("the splash is in the first frame", () => {
  it("renders the overlay unconditionally, with no effect to wait for", () => {
    // The regression, exactly: this used to be "" until React had hydrated.
    expect(html()).toContain('data-splash="true"');
  });

  it("puts the once-per-session check ahead of the overlay", () => {
    // Order is the whole mechanism. The script sets the attribute that hides
    // the overlay; parsed after it, the attribute would land too late and a
    // return visit would see a frame of splash before it vanished.
    //
    // Located by the tag rather than by the storage key, so that renaming the
    // key fails the test about the key and not this one.
    const rendered = html();
    const script = rendered.indexOf("<script");
    const overlay = rendered.indexOf('data-splash="true"');
    expect(script).toBeGreaterThanOrEqual(0);
    expect(overlay).toBeGreaterThan(script);
  });

  it("leaves the script parser-blocking", () => {
    // src, async or defer would all postpone it past the overlay's parse and
    // reintroduce the flash this ordering exists to avoid.
    const tag = /<script[^>]*>/u.exec(html())?.[0] ?? "";
    expect(tag).not.toMatch(/\b(?:src|async|defer)\b/u);
  });

  it("carries the nonce it is given, because production CSP is nonce-based", () => {
    // script-src is 'nonce-...' 'strict-dynamic' in production: an inline
    // script without one is dropped, and the splash would then replay on
    // every single load.
    expect(html("n0nc3")).toContain('nonce="n0nc3"');
  });

  it("hides itself where there is no scripting to set the marker", () => {
    const rendered = html();
    expect(rendered).toContain("<noscript>");
    expect(rendered.slice(rendered.indexOf("<noscript>"))).toContain("[data-splash]{display:none}");
  });
});

describe("the storage key stays the one the privacy page publishes", () => {
  it("is named in the privacy page's storage table", () => {
    // The key is listed to the reader with its lifetime ("Fermeture de
    // l'onglet"). Renaming it in the component alone would leave the published
    // table describing something the site no longer stores.
    const privacy = readFileSync(join(__dirname, "..", "..", "app", "privacy", "page.tsx"), "utf8");
    // Read off the tag's data attribute, which is where the key now travels.
    const key = /data-splash-key="(.+?)"/u.exec(html())?.[1];
    expect(key).toBe("cl-splash-shown");
    expect(privacy).toContain(`"${String(key)}"`);
  });

  it("keeps the key out of the script source", () => {
    // CodeQL flagged the first version of this (js/bad-code-sanitization,
    // CWE-094): the key was interpolated into the script body with
    // JSON.stringify, which escapes for JSON and not for JavaScript source.
    // The value was a literal, so nothing was exploitable - but the pattern
    // builds a program out of a string, and the next value put through it
    // might not be a literal. The script is fixed text now.
    const rendered = html();
    const body = /<script[^>]*>([\s\S]*?)<\/script>/u.exec(rendered)?.[1] ?? "";
    expect(body).not.toContain("cl-splash-shown");
    expect(body).toContain("dataset.splashKey");
  });

  it("uses sessionStorage, which is what that published lifetime means", () => {
    // "Fermeture de l'onglet" is a promise about where this lives. localStorage
    // would outlive the tab and make the published table false.
    const rendered = html();
    expect(rendered).toContain("sessionStorage");
    expect(rendered).not.toContain("localStorage");
  });
});
