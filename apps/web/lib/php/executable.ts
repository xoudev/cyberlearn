/**
 * Would a browser run code that is in this page? The question a <PhpLab> asks
 * about what a page answers, to say whether an injection worked.
 *
 * The page is read by the browser's own HTML parser, in a document that is
 * never shown or run (DOMParser runs no script, loads no image): what the
 * parser makes of the text, with its quirks, is what a real visitor's browser
 * would make of it. A script, an event handler (onerror=, onfocus=), and a
 * javascript: address are the three ways code gets in.
 */

export type ExecutableKind = "script" | "handler" | "javascript-url";

export interface ExecutableFinding {
  kind: ExecutableKind;
  /** What was found, shortened for a line of text. */
  detail: string;
}

/** The attributes whose value is an address, so can start with javascript:. */
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

const MAX_DETAIL = 60;

function clip(text: string | null): string {
  const flat = (text ?? "").replace(/\s+/gu, " ").trim();
  return flat.length > MAX_DETAIL ? `${flat.slice(0, MAX_DETAIL)}…` : flat;
}

/** A browser ignores spaces, tabs and line breaks before and inside the scheme. */
function isJavascriptAddress(value: string): boolean {
  let squeezed = "";
  for (const ch of value) {
    if (ch.charCodeAt(0) > 32) squeezed += ch;
  }
  return squeezed.toLowerCase().startsWith("javascript:");
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
      } else if (ADDRESS_ATTRIBUTES.has(name) && isJavascriptAddress(attribute.value)) {
        findings.push({ kind: "javascript-url", detail: `${name}="${clip(attribute.value)}"` });
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
  }
}
