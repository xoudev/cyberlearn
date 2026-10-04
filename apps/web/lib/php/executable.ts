/**
 * Would a browser run code that is in this page? The question a <PhpLab> asks
 * about what a page answers, to say whether an injection worked.
 *
 * The page is read by the browser's own HTML parser, in a document that is
 * never shown or run (DOMParser runs no script, loads no image): what the
 * parser makes of the text, with its quirks, is what a real visitor's browser
 * would make of it. A script, an event handler (onerror=, onfocus=), and an
 * address whose scheme runs code (javascript:, vbscript:, or a data: page
 * loaded in a frame) are the ways code gets in.
 */

export type ExecutableKind = "script" | "handler" | "javascript-url" | "vbscript-url" | "data-url";

export interface ExecutableFinding {
  kind: ExecutableKind;
  /** What was found, shortened for a line of text. */
  detail: string;
}

/** The attributes whose value is an address, so can start with a scheme that runs code. */
const ADDRESS_ATTRIBUTES = new Set([
  "href",
  "src",
  "action",
  "formaction",
  "data",
  "poster",
  "background",
  "xlink:href",
]);

/**
 * The elements that load their address as a page of its own. A data: page runs
 * its script there; followed from a link or a form, browsers refuse it, and
 * loaded as an image or a style sheet it runs nothing.
 */
const DOCUMENT_ELEMENTS = new Set(["iframe", "frame", "embed", "object"]);

/** Only here to give a relative address something to be relative to. */
const BASE = "http://lab.cyberlearn.local/";

const MAX_DETAIL = 60;

function clip(text: string | null): string {
  const flat = (text ?? "").replace(/\s+/gu, " ").trim();
  return flat.length > MAX_DETAIL ? `${flat.slice(0, MAX_DETAIL)}…` : flat;
}

/**
 * The scheme of an address, read by the URL parser a browser uses: it drops
 * the spaces before the address and the tabs and line breaks inside it,
 * folds capitals, and sees no scheme in `/page?next=javascript:x`.
 */
function schemeOf(address: string): string {
  try {
    return new URL(address, BASE).protocol;
  } catch {
    return "";
  }
}

/** What an address does when a browser follows it, or null when it runs nothing. */
function addressKind(element: Element, address: string): ExecutableKind | null {
  switch (schemeOf(address)) {
    case "javascript:":
      return "javascript-url";
    case "vbscript:":
      return "vbscript-url";
    case "data:":
      return DOCUMENT_ELEMENTS.has(element.localName) ? "data-url" : null;
    default:
      return null;
  }
}

export function findExecutableContent(html: string): ExecutableFinding[] {
  const document = new DOMParser().parseFromString(html, "text/html");
  const findings: ExecutableFinding[] = [];
  for (const script of document.querySelectorAll("script")) {
    const address = script.getAttribute("src");
    findings.push({
      kind: "script",
      detail: address === null ? clip(script.textContent) : `src="${clip(address)}"`,
    });
  }
  for (const element of document.querySelectorAll("*")) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on")) {
        findings.push({ kind: "handler", detail: `${name}="${clip(attribute.value)}"` });
        continue;
      }
      const kind = ADDRESS_ATTRIBUTES.has(name) ? addressKind(element, attribute.value) : null;
      if (kind !== null) {
        findings.push({ kind, detail: `${name}="${clip(attribute.value)}"` });
      }
    }
  }
  return findings;
}

/** A finding, said in a few words. */
export function describeFinding(finding: ExecutableFinding): string {
  switch (finding.kind) {
    case "script":
      return `une balise <script> (${finding.detail})`;
    case "handler":
      return `un gestionnaire d'événement (${finding.detail})`;
    case "javascript-url":
      return `une adresse javascript: (${finding.detail})`;
    case "vbscript-url":
      return `une adresse vbscript: (${finding.detail})`;
    case "data-url":
      return `une page data: chargée dans un cadre (${finding.detail})`;
  }
}
