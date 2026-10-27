import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The rules that keep the site usable at 375, 768 and 1440px, read from the
 * stylesheets: there is no layout in jsdom, so what is checked is the rule
 * itself. Each one answers something the four-width replay of the site found.
 */

const GLOBALS = read("../../app/globals.css");
const DIALOGS = read("../../../../packages/ui/src/dialogs.css");
const RAPPEL = read("../rappel/rappel.css");
const TWO_MACHINES = read("../../app/(app)/lessons/[slug]/_components/two-machine-lab.css");
const CHROME = read("../app-chrome.css");

function read(relative: string): string {
  return readFileSync(path.resolve(__dirname, relative), "utf8");
}

/** The stylesheet without its comments, which quote the rules they explain. */
function bare(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//gu, "");
}

/** The bodies of the blocks at the top level of `css` whose header is `header`. */
function blocks(css: string, header: string): string[] {
  const text = bare(css);
  const found: string[] = [];
  let start = 0;
  let depth = 0;
  let prelude = "";
  let bodyAt = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "{") {
      if (depth === 0) {
        prelude = text.slice(start, i).trim().replace(/\s+/gu, " ");
        bodyAt = i + 1;
      }
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        const selectors = prelude.split(",").map((s) => s.trim());
        if (prelude === header || selectors.includes(header)) found.push(text.slice(bodyAt, i));
        start = i + 1;
      }
    } else if (c === ";" && depth === 0) {
      start = i + 1;
    }
  }
  return found;
}

/** The one block of that header: a rule written twice would be a surprise worth failing on. */
function rule(css: string, header: string): string {
  const [only, ...rest] = blocks(css, header);
  if (only === undefined) throw new Error(`no rule for ${header}`);
  if (rest.length > 0) throw new Error(`${header} is written ${String(rest.length + 1)} times`);
  return only;
}

/** The rule for `selector` inside the media or container query `query`. */
function inQuery(css: string, query: string, selector: string): string {
  const found = blocks(css, query)
    .map((body) => blocks(body, selector))
    .flat();
  const [only] = found;
  if (only === undefined) throw new Error(`no ${selector} in ${query}`);
  return only;
}

/** Every value a block gives a property, in order (a fallback comes first). */
function values(block: string, property: string): string[] {
  return block
    .split(";")
    .map((declaration) => {
      const colon = declaration.indexOf(":");
      return colon === -1
        ? null
        : { name: declaration.slice(0, colon).trim(), value: declaration.slice(colon + 1).trim() };
    })
    .filter((entry) => entry?.name === property)
    .map((entry) => entry?.value ?? "");
}

describe("the stylesheet reader", () => {
  it("finds a rule by its selector, alone or in a list, and inside a query", () => {
    const css = ".a, .b { x: 1 } @media (max-width: 9px) { .a { x: 2; x: 3 } } .c .a { x: 4 }";
    expect(rule(css, ".a")).toContain("x: 1");
    expect(rule(css, ".b")).toContain("x: 1");
    expect(values(inQuery(css, "@media (max-width: 9px)", ".a"), "x")).toEqual(["2", "3"]);
  });
});

describe("the notes docked beside a lesson", () => {
  it("sit under the navbar, whose panels would otherwise open beneath them", () => {
    const navbarLayer = Number(
      blocks(CHROME, ".app-frame .navbar-header").flatMap((body) => values(body, "z-index"))[0],
    );
    const dockedLayer = Number(values(rule(DIALOGS, ".side-drawer--docked"), "z-index")[0]);
    expect(navbarLayer).toBeGreaterThan(0);
    // The navbar is a stacking context, so what it opens is held at its own
    // layer whatever the panel's z-index: a drawer above it is over the panel.
    expect(dockedLayer).toBeLessThan(navbarLayer);
  });

  it("stay over what sticks under the navbar: the lesson's toolbar", () => {
    const toolbarLayer = Number(values(rule(GLOBALS, ".lesson-toolbar"), "z-index")[0]);
    const dockedLayer = Number(values(rule(DIALOGS, ".side-drawer--docked"), "z-index")[0]);
    expect(toolbarLayer).toBeGreaterThan(0);
    expect(dockedLayer).toBeGreaterThan(toolbarLayer);
  });
});

describe("the drawers and windows on a phone's browser bars", () => {
  it("sizes the navigation drawer by the visible height, with the old unit as a fallback", () => {
    const drawer = inQuery(GLOBALS, "@media (max-width: 1023px)", ".sidebar-wrapper");
    // The later declaration wins where `dvh` is known; the earlier one is what
    // an older browser reads.
    expect(values(drawer, "height")).toEqual(["100vh", "100dvh"]);
  });

  it("caps a window's frame by the visible height as well", () => {
    expect(values(rule(DIALOGS, ".modal-shell__frame"), "max-height")).toEqual([
      "calc(100vh - 48px)",
      "calc(100dvh - 48px)",
    ]);
  });
});

describe("the day's recall window", () => {
  it("holds its content in from the frame, on the header's 24px", () => {
    const body = rule(RAPPEL, ".rp");
    expect(values(body, "padding")).toEqual(["20px 24px 24px"]);
    // The header and the action row of a window, which the body lines up with.
    expect(values(rule(DIALOGS, ".modal-shell__head"), "padding")).toEqual(["20px 24px"]);
    expect(values(rule(DIALOGS, ".modal-shell__actions"), "padding")).toEqual(["20px 24px"]);
  });
});

describe("the Wrapped chip in the navbar", () => {
  it("keeps only its icon on a phone, where the bar is wider than the screen with the word", () => {
    const label = inQuery(GLOBALS, "@media (max-width: 420px)", ".wr-chip__label");
    expect(values(label, "display")).toEqual(["none"]);
  });

  it("still drops the year first, from 560px down", () => {
    const year = inQuery(GLOBALS, "@media (max-width: 560px)", ".wr-chip__year");
    expect(values(year, "display")).toEqual(["none"]);
  });
});

describe("the breadcrumb", () => {
  it("goes on to another line, every page's, rather than running off a phone", () => {
    const crumb = rule(GLOBALS, ".pg-crumb");
    expect(values(crumb, "flex-wrap")).toEqual(["wrap"]);
    expect(values(crumb, "max-width")).toEqual(["100%"]);
  });

  it("breaks a long segment where it must", () => {
    expect(values(rule(GLOBALS, ".pg-crumb__leaf"), "overflow-wrap")).toEqual(["anywhere"]);
    expect(values(rule(GLOBALS, ".pg-crumb__link"), "overflow-wrap")).toEqual(["anywhere"]);
  });
});

describe("a friend's row in the navbar's panel", () => {
  it("lets the actions go under the name when it cannot keep 64px beside them", () => {
    expect(values(rule(GLOBALS, ".fp-row"), "flex-wrap")).toEqual(["wrap"]);
    expect(values(rule(GLOBALS, ".fp-identity"), "flex")).toEqual(["1 1 64px"]);
    expect(values(rule(GLOBALS, ".fp-actions"), "margin-left")).toEqual(["auto"]);
  });
});

describe("the two machines of a lab", () => {
  it("stand side by side by the lesson block's width, not the window's", () => {
    const wide = inQuery(
      TWO_MACHINES,
      "@container lesson-block (min-width: 900px)",
      ".two-machine-lab__machines",
    );
    expect(values(wide, "grid-template-columns")).toEqual(["repeat(2, minmax(0, 1fr))"]);
    expect(
      values(rule(TWO_MACHINES, ".two-machine-lab__machines"), "grid-template-columns"),
    ).toEqual(["minmax(0, 1fr)"]);
  });
});
