// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { describeFinding, findExecutableContent } from "../executable";

/**
 * "Would a browser run it?", asked of what the HTML parser makes of a page,
 * on the payloads of the XSS lessons and on the ways to hide them.
 */

const kinds = (html: string): string[] => findExecutableContent(html).map((f) => f.kind);

describe("findExecutableContent", () => {
  it("finds nothing in a page that holds only text and markup", () => {
    expect(
      findExecutableContent(
        `<!doctype html><h1>Blog</h1><form method="get"><input name="q" value="php"><button>OK</button></form><a href="/search.php?q=x">x</a><img src="/logo.png" alt="">`,
      ),
    ).toEqual([]);
  });

  it("finds a script, inline or from an address", () => {
    expect(findExecutableContent("<p>Résultats pour : <script>alert(1)</script></p>")).toEqual([
      { kind: "script", detail: "alert(1)" },
    ]);
    expect(findExecutableContent(`<script src="https://evil.example/x.js"></script>`)).toEqual([
      { kind: "script", detail: 'src="https://evil.example/x.js"' },
    ]);
  });

  it("finds an event handler, on any element", () => {
    expect(findExecutableContent(`<img src=x onerror=alert(1)>`)).toEqual([
      { kind: "handler", detail: 'onerror="alert(1)"' },
    ]);
    expect(kinds(`<svg onload="alert(1)"></svg>`)).toEqual(["handler"]);
    expect(kinds(`<body ONLOAD="x()"><p>hi</p></body>`)).toEqual(["handler"]);
  });

  it("finds the quote that breaks out of an attribute: the handler it adds", () => {
    // value="<q>" with q = " autofocus onfocus="alert(1)
    expect(findExecutableContent(`<input name="q" value="" autofocus onfocus="alert(1)">`)).toEqual(
      [{ kind: "handler", detail: 'onfocus="alert(1)"' }],
    );
  });

  it("finds a javascript: address, even with the scheme broken up or in capitals", () => {
    expect(kinds(`<a href="javascript:alert(1)">x</a>`)).toEqual(["javascript-url"]);
    expect(kinds(`<a href="JaVaScRiPt:alert(1)">x</a>`)).toEqual(["javascript-url"]);
    expect(kinds(`<a href="&#x09;java&#x0A;script:alert(1)">x</a>`)).toEqual(["javascript-url"]);
    expect(kinds(`<form action="javascript:alert(1)"><button>go</button></form>`)).toEqual([
      "javascript-url",
    ]);
    expect(kinds(`<iframe src="javascript:alert(1)"></iframe>`)).toEqual(["javascript-url"]);
  });

  it("finds a vbscript: address too, whatever the capitals", () => {
    expect(kinds(`<a href="vbscript:msgbox(1)">x</a>`)).toEqual(["vbscript-url"]);
    expect(kinds(`<a href="VBScript:x">x</a>`)).toEqual(["vbscript-url"]);
  });

  it("finds a data: page where an element loads it as a page of its own", () => {
    expect(kinds(`<iframe src="data:text/html,<p>x</p>"></iframe>`)).toEqual(["data-url"]);
    expect(kinds(`<embed src="data:text/html;base64,PHA+eDwvcD4=">`)).toEqual(["data-url"]);
    expect(kinds(`<object data="data:text/html,x"></object>`)).toEqual(["data-url"]);
  });

  it("leaves alone a data: address that runs nothing: an image, a link, a broken address", () => {
    expect(kinds(`<img src="data:image/png;base64,iVBORw0KGgo=" alt="">`)).toEqual([]);
    expect(kinds(`<a href="data:text/html,x">x</a>`)).toEqual([]);
    expect(kinds(`<a href="http://[::1">x</a>`)).toEqual([]);
  });

  it("leaves alone what was written as text: the escaped payload", () => {
    expect(
      findExecutableContent(
        `<p>Résultats pour : &lt;script&gt;alert(1)&lt;/script&gt;</p><input value="&quot; onfocus=&quot;alert(1)">`,
      ),
    ).toEqual([]);
    expect(kinds(`<textarea><script>alert(1)</script></textarea>`)).toEqual([]);
    expect(kinds(`<a href="/page?next=javascript:alert(1)">x</a>`)).toEqual([]);
  });

  it("says what was found in a few words", () => {
    expect(describeFinding({ kind: "script", detail: "alert(1)" })).toBe(
      "une balise <script> (alert(1))",
    );
    expect(describeFinding({ kind: "handler", detail: 'onerror="x"' })).toBe(
      `un gestionnaire d'événement (onerror="x")`,
    );
    expect(describeFinding({ kind: "javascript-url", detail: 'href="javascript:x"' })).toBe(
      'une adresse javascript: (href="javascript:x")',
    );
    expect(describeFinding({ kind: "vbscript-url", detail: 'href="vbscript:x"' })).toBe(
      'une adresse vbscript: (href="vbscript:x")',
    );
    expect(describeFinding({ kind: "data-url", detail: 'src="data:text/html,x"' })).toBe(
      'une page data: chargée dans un cadre (src="data:text/html,x")',
    );
  });

  it("shortens a long finding to a line", () => {
    const [finding] = findExecutableContent(`<script>${"a".repeat(200)}</script>`);
    expect(finding?.detail.length).toBe(61);
    expect(finding?.detail.endsWith("…")).toBe(true);
  });
});
