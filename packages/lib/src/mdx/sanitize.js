"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mdxSanitizeSchema = void 0;
/**
 * Strict allowlist schema for rehype-sanitize.
 * Prevents XSS in MDX lesson content and Q&A answers.
 *
 * Pass to rehypeSanitize() as the schema argument.
 * Applied AFTER rehype-highlight so syntax class names are preserved.
 */
exports.mdxSanitizeSchema = {
  strip: ["script", "style", "object", "embed", "form", "input", "button", "iframe", "base"],
  attributes: {
    // className allowed on code/pre/span/div for syntax highlighting (rehype-highlight)
    code: ["className"],
    pre: ["className"],
    span: ["className"],
    div: ["className"],
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    blockquote: ["cite"],
    td: ["align"],
    th: ["align"],
  },
  protocols: {
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
  },
  tagNames: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "br",
    "hr",
    "strong",
    "em",
    "del",
    "s",
    "sup",
    "sub",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "code",
    "span",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "div",
  ],
};
//# sourceMappingURL=sanitize.js.map
