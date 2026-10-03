import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { evaluate } from "@mdx-js/mdx";
import { isValidElement, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import { describe, expect, it } from "vitest";
import { findGlossaryTerms } from "./match";
import { rehypeGlossary } from "./rehype";
import { GLOSSARY } from "./terms";

describe("the glossary list", () => {
  it("names every slug once", () => {
    const slugs = GLOSSARY.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every form to one term only", () => {
    const owners = new Map<string, string>();
    for (const term of GLOSSARY) {
      for (const form of term.match) {
        expect(owners.get(form), `${form} in ${term.slug}`).toBeUndefined();
        owners.set(form, term.slug);
      }
    }
  });

  it.each(GLOSSARY.map((t) => [t.slug, t]))("%s reads in one breath", (_slug, term) => {
    expect(term.definition.length).toBeGreaterThan(30);
    expect(term.definition.length).toBeLessThanOrEqual(220);
    expect(term.definition).toMatch(/[.)]$/);
    // Em and en dashes, by code point: the typography check refuses the characters.
    expect(term.definition).not.toMatch(new RegExp("[\\u2014\\u2013]", "u"));
    expect(term.match.length).toBeGreaterThan(0);
  });
});

describe("findGlossaryTerms", () => {
  const find = (text: string, seen = new Set<string>()) =>
    findGlossaryTerms(text, seen).map((h) => [h.text, h.term.slug]);

  it("finds whole words only", () => {
    expect(find("Le transport passe par le port 22.")).toEqual([["port", "port"]]);
    expect(find("IPv4 n'est pas IP.")).toEqual([["IPv4", "ipv4"]]);
    expect(find("le mot-clé SSH-agent")).toEqual([]);
  });

  it("prefers the longest form", () => {
    expect(find("Une injection SQL vise la base.")).toEqual([["injection SQL", "injection-sql"]]);
  });

  it("reads a lowercase form at the start of a sentence, after an elision too", () => {
    expect(find("Pare-feu et routeur.")).toEqual([
      ["Pare-feu", "pare-feu"],
      ["routeur", "routeur"],
    ]);
    expect(find("La force de l'authentification.")).toEqual([
      ["authentification", "authentification"],
    ]);
  });

  it("takes each term once across the calls that share a set", () => {
    const seen = new Set<string>();
    expect(find("DNS, puis DNS.", seen)).toEqual([["DNS", "dns"]]);
    expect(find("Encore le DNS.", seen)).toEqual([]);
  });

  it("does not read acronyms in lowercase", () => {
    expect(find("le dns et le tcp")).toEqual([]);
  });
});

/** The rendered tree as compact HTML, enough to read what was wrapped. */
function html(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map((n) => html(n as ReactNode)).join("");
  if (!isValidElement(node)) return "";
  // SAFETY: an element's props are an object; only read here.
  const props = node.props as Record<string, unknown>;
  const inner = html(props.children as ReactNode);
  if (typeof node.type !== "string") return `<Component>${inner}</Component>`;
  const cls = typeof props.className === "string" ? ` class="${props.className}"` : "";
  return `<${node.type}${cls}>${inner}</${node.type}>`;
}

async function render(mdx: string): Promise<string> {
  const { default: Content } = await evaluate(mdx, {
    ...runtime,
    rehypePlugins: [[rehypeGlossary, { idPrefix: "t" }]],
    development: false,
  });
  // SAFETY: the default export of compiled MDX is its content function.
  const content = Content as unknown as (p: { components: Record<string, unknown> }) => ReactNode;
  const Callout = ({ children }: { children?: ReactNode }): ReactNode => children;
  const Quiz = (): null => null;
  return html(content({ components: { Callout, Quiz } }));
}

describe("rehypeGlossary", () => {
  it("wraps the first occurrence with its definition", async () => {
    const out = await render("Le DNS traduit les noms. Le DNS répond vite.");
    expect(out).toContain('<span class="glossary-term">DNS<span class="glossary-tip">');
    expect(out).toContain("<strong>DNS</strong> L'annuaire");
    expect(out.match(/glossary-term/g)).toHaveLength(1);
  });

  it("leaves code, links and headings alone", async () => {
    const out = await render(
      [
        "## Le DNS",
        "",
        "Lancez `dig DNS` ou lisez [le DNS](https://example.org).",
        "",
        "```",
        "SSH et DNS",
        "```",
      ].join("\n"),
    );
    expect(out).not.toContain("glossary-term");
  });

  it("reads a Callout's text, not other components' props", async () => {
    const out = await render(
      '<Callout type="info">Activez le pare-feu.</Callout>\n\n<Quiz question="Le DNS ?" options={["a", "b"]} correct={0} />',
    );
    expect(out).toContain('<span class="glossary-term">pare-feu');
    expect(out).not.toContain("<strong>DNS</strong>");
  });

  it("gives each tooltip an id of its own, tied to its word", () => {
    const tree = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "DNS et SSH." }],
        },
      ],
    };
    rehypeGlossary({ idPrefix: "s2" })(tree);
    const terms = (tree.children[0]?.children ?? []).filter(
      (n): n is typeof n & { properties: Record<string, unknown> } => "tagName" in n,
    );
    expect(terms.map((t) => t.properties.ariaDescribedBy)).toEqual(["s2-dns-0", "s2-ssh-1"]);
  });
});

describe("the lessons of content/", () => {
  const ROOT = path.resolve(__dirname, "../../../../content/lessons");
  const files = (function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return walk(full);
      return name.endsWith(".mdx") ? [full] : [];
    });
  })(ROOT);
  const corpus = files.map((f) => readFileSync(f, "utf8")).join("\n");

  // A term no lesson uses is a definition nobody will ever see underlined.
  it.each(GLOSSARY.map((t) => [t.slug]))("use %s", (slug) => {
    expect(findGlossaryTerms(corpus, new Set()).some((h) => h.term.slug === slug)).toBe(true);
  });
});
