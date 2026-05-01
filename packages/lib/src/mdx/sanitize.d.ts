/**
 * Strict allowlist schema for rehype-sanitize.
 * Prevents XSS in MDX lesson content and Q&A answers.
 *
 * Pass to rehypeSanitize() as the schema argument.
 * Applied AFTER rehype-highlight so syntax class names are preserved.
 */
export declare const mdxSanitizeSchema: {
  readonly strip: readonly [
    "script",
    "style",
    "object",
    "embed",
    "form",
    "input",
    "button",
    "iframe",
    "base",
  ];
  readonly attributes: {
    readonly code: readonly ["className"];
    readonly pre: readonly ["className"];
    readonly span: readonly ["className"];
    readonly div: readonly ["className"];
    readonly a: readonly ["href", "title", "target", "rel"];
    readonly img: readonly ["src", "alt", "title", "width", "height"];
    readonly blockquote: readonly ["cite"];
    readonly td: readonly ["align"];
    readonly th: readonly ["align"];
  };
  readonly protocols: {
    readonly href: readonly ["http", "https", "mailto"];
    readonly src: readonly ["http", "https"];
  };
  readonly tagNames: readonly [
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
  ];
};
//# sourceMappingURL=sanitize.d.ts.map
