import { findGlossaryTerms, type GlossaryHit } from "./match";

/**
 * Underlines the glossary words of a compiled lesson section, with their
 * definition in a tooltip that shows on hover and on focus.
 *
 * It works on the HTML tree (rehype), after MDX has turned the section into
 * elements, so that it only ever sees prose: code, links and headings are
 * skipped, and of the components only a Callout's text is read, since the
 * others hold code, commands or quiz answers. Each word is underlined the
 * first time it appears in the section.
 *
 * The tooltip is plain HTML and CSS (`.glossary-term`, `.glossary-tip` in the
 * site's stylesheet): nothing runs in the browser for it. The word can take the
 * focus, so a keyboard or a tap reaches the definition too, and the definition
 * is tied to it by aria-describedby.
 */

/** The parts of a HTML (hast) node this plugin reads and writes. */
interface Node {
  type: string;
  tagName?: string;
  name?: string | null;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
}

/** Elements whose text is not prose. */
const SKIPPED_TAGS = new Set([
  "a",
  "button",
  "code",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "kbd",
  "pre",
  "samp",
  "script",
  "style",
]);

/** The one component whose children are prose. */
const PROSE_COMPONENTS = new Set(["Callout"]);

export interface RehypeGlossaryOptions {
  /** Makes the tooltip ids unique on a page that compiles several sections. */
  idPrefix?: string;
}

function text(value: string): Node {
  return { type: "text", value };
}

function termElement(hit: GlossaryHit, id: string): Node {
  return {
    type: "element",
    tagName: "span",
    properties: { className: ["glossary-term"], tabIndex: 0, ariaDescribedBy: id },
    children: [
      text(hit.text),
      {
        type: "element",
        tagName: "span",
        properties: { className: ["glossary-tip"], role: "tooltip", id },
        children: [
          {
            type: "element",
            tagName: "strong",
            properties: {},
            children: [text(hit.term.term)],
          },
          text(` ${hit.term.definition}`),
        ],
      },
    ],
  };
}

function canDescend(node: Node): boolean {
  if (node.type === "element") return !SKIPPED_TAGS.has(node.tagName ?? "");
  if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
    return PROSE_COMPONENTS.has(node.name ?? "");
  }
  return node.type === "root";
}

export function rehypeGlossary(options: RehypeGlossaryOptions = {}) {
  const prefix = options.idPrefix ?? "g";
  return (tree: Node): void => {
    const seen = new Set<string>();
    let count = 0;

    const visit = (node: Node): void => {
      if (node.children === undefined || !canDescend(node)) return;
      const children: Node[] = [];
      for (const child of node.children) {
        if (child.type !== "text" || child.value === undefined) {
          visit(child);
          children.push(child);
          continue;
        }
        const value = child.value;
        let at = 0;
        for (const hit of findGlossaryTerms(value, seen)) {
          if (hit.start > at) children.push(text(value.slice(at, hit.start)));
          children.push(termElement(hit, `${prefix}-${hit.term.slug}-${String(count++)}`));
          at = hit.end;
        }
        children.push(at === 0 ? child : text(value.slice(at)));
      }
      node.children = children.filter((c) => c.type !== "text" || c.value !== "");
    };

    visit(tree);
  };
}
