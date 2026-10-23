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

/**
 * The address of the link whose text is exactly `label`. Read with string
 * operations, not a pattern built from the label: a label is data, and a
 * dynamic RegExp is what the Semgrep rules refuse.
 */
function hrefOf(html: string, label: string): string | undefined {
  const opening = "<a";
  const hrefStart = 'href="';
  // The first piece is what comes before the first link.
  for (const piece of html.split(opening).slice(1)) {
    const end = piece.indexOf(">");
    // `<a` is a link only when a space or `>` follows: `<abbr` and the like are not.
    if (end === -1 || (!piece.startsWith(" ") && !piece.startsWith(">"))) continue;
    if (piece.slice(end + 1, end + 1 + label.length + "</a>".length) !== `${label}</a>`) continue;
    const attributes = piece.slice(0, end);
    const start = attributes.indexOf(hrefStart);
    if (start === -1) continue;
    const valueStart = start + hrefStart.length;
    const valueEnd = attributes.indexOf('"', valueStart);
    if (valueEnd === -1) continue;
    return attributes.slice(valueStart, valueEnd);
  }
  return undefined;
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
