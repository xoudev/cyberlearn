import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Footer } from "../footer";

/**
 * The footer is drawn by the app's shell and by the legal pages around the
 * site. Its "Contact" used to lead everybody to the visitors' form, a page
 * outside the app where the address is typed by hand, even from the app, where
 * the answer should reach the account's own.
 */

function hrefOf(html: string, label: string): string | undefined {
  const match = new RegExp(`<a[^>]*href="([^"]*)"[^>]*>${label}</a>`, "u").exec(html);
  return match?.[1];
}

describe("Footer", () => {
  it("leads a visitor's Contact to the public form", () => {
    expect(hrefOf(renderToStaticMarkup(<Footer />), "Contact")).toBe("/contact");
  });

  it("opens the request window from the app's footer, answered at the account's address", () => {
    expect(hrefOf(renderToStaticMarkup(<Footer signedIn />), "Contact")).toBe("/support?request=1");
  });

  it("keeps the other links the same either way", () => {
    for (const html of [
      renderToStaticMarkup(<Footer />),
      renderToStaticMarkup(<Footer signedIn />),
    ]) {
      expect(hrefOf(html, "Application mobile")).toBe("/download");
      expect(hrefOf(html, "Vérifier un certificat")).toBe("/verify");
      expect(hrefOf(html, "Mentions légales")).toBe("/legal");
    }
  });
});
