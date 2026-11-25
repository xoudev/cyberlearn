import { describe, expect, it } from "vitest";
import { fromPortableMarkdown, toPortableMarkdown } from "../portable-markdown";
import { parseRichMarkdown } from "../rich-markdown";

/**
 * The .md export writes the workspace's own marks the way other readers draw
 * them, and the import reads them back.
 */

describe("toPortableMarkdown", () => {
  it("writes coloured text and highlights as inline HTML", () => {
    expect(toPortableMarkdown("un [mot]{rouge} et [fond]{fond-vert} puis ==jaune==")).toBe(
      'un <span style="color: #C62E3A">mot</span> et <mark style="background: #D2F1E0">fond</mark> puis <mark>jaune</mark>',
    );
  });

  it("keeps the markdown inside a mark, and marks inside bold or links", () => {
    expect(toPortableMarkdown("[**gras**]{bleu} **==a==** [lien ==b==](https://x.fr)")).toBe(
      '<span style="color: #1F5FA8">**gras**</span> **<mark>a</mark>** [lien <mark>b</mark>](https://x.fr)',
    );
  });

  it("does not open a mark across a bold the workspace closes first", () => {
    expect(toPortableMarkdown("**a==b** c==")).toBe("**a==b** c==");
  });

  it("leaves code, escapes, links between notes and unknown colours as written", () => {
    const md = [
      "`[x]{rouge}` \\==pas== [[Note|lien]] [mot]{rose}",
      "```",
      "[x]{rouge} ==y==",
      "> [!astuce]",
      "```",
    ].join("\n");
    expect(toPortableMarkdown(md)).toBe(md);
  });

  it("writes callouts as GitHub alerts, with their title or French name", () => {
    expect(toPortableMarkdown("> [!astuce] Retenir\n> le texte")).toBe(
      "> [!TIP]\n> **Retenir**\n> le texte",
    );
    expect(toPortableMarkdown("> [!attention]\n> x")).toBe("> [!WARNING]\n> x");
    expect(toPortableMarkdown("> [!question]\n> x")).toBe("> [!IMPORTANT]\n> **Question**\n> x");
  });

  it("only reads a callout on a quote's first line", () => {
    expect(toPortableMarkdown("> texte\n> [!astuce] pas un titre")).toBe(
      "> texte\n> [!astuce] pas un titre",
    );
  });
});

describe("fromPortableMarkdown", () => {
  it("reads the export's marks back, nested ones too", () => {
    const md = "un [mot]{rouge}, [**fond**]{fond-vert}, ==jaune== et [[a]{violet}]{fond-gris}";
    expect(fromPortableMarkdown(toPortableMarkdown(md))).toBe(md);
  });

  it("keeps a library's colours through an export and an import", () => {
    const md = "# Titre\n\n- [x] [fait]{vert}\n\n| a | b |\n| - | - |\n| ==x== | [y]{bleu} |";
    const back = fromPortableMarkdown(toPortableMarkdown(md));
    expect(parseRichMarkdown(back)).toEqual(parseRichMarkdown(md));
  });

  it("reads a callout back as the alert's kind, CAUTION as danger", () => {
    const back = fromPortableMarkdown(toPortableMarkdown("> [!danger] Stop\n> x"));
    expect(back).toBe("> [!danger]\n> **Stop**\n> x");
    expect(parseRichMarkdown(back)[0]).toMatchObject({ kind: "callout", variant: "danger" });
  });

  it("leaves other HTML, other colours and code alone", () => {
    const md = [
      '<span style="color: #123456">x</span> <b>y</b>',
      "`<mark>code</mark>`",
      "```html",
      "<mark>z</mark>",
      "```",
    ].join("\n");
    expect(fromPortableMarkdown(md)).toBe(md);
  });
});
