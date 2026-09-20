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
    expect(/<script[^>]*>/u.exec(html())?.[0] ?? "").not.toMatch(/\b(?:src|async|defer)\b/u);
  });

  it("keeps its own session key, so the two splashes do not silence each other", () => {
    // The console and the site are different origins today, but the key says
    // which splash it is either way - and if they ever share one, one visit to
    // the site must not suppress the console's.
    expect(html()).toContain("cl-admin-splash-shown");
  });

  it("uses sessionStorage, so the animation returns with a new tab", () => {
    const rendered = html();
    expect(rendered).toContain("sessionStorage");
    expect(rendered).not.toContain("localStorage");
  });
});
