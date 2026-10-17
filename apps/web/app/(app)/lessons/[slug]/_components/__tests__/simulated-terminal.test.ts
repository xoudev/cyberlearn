// @vitest-environment jsdom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { completePrefix, SimulatedTerminal } from "../simulated-terminal";

describe("completePrefix", () => {
  const COMMANDS = ["cat robots.txt", "curl http://target.ctf/", "curl -I http://target.ctf/admin"];

  it("completes to the full command when only one matches", () => {
    expect(completePrefix("cat", COMMANDS)).toEqual({
      completion: "cat robots.txt",
      matches: ["cat robots.txt"],
    });
  });

  it("stops at the prefix the ambiguous matches share", () => {
    const { completion, matches } = completePrefix("cur", COMMANDS);
    expect(completion).toBe("curl ");
    expect(matches).toHaveLength(2);
  });

  it("keeps advancing once the prefix distinguishes them", () => {
    expect(completePrefix("curl -", COMMANDS).completion).toBe("curl -I http://target.ctf/admin");
  });

  it("leaves the input alone when nothing matches", () => {
    expect(completePrefix("nmap", COMMANDS)).toEqual({ completion: "nmap", matches: [] });
  });

  it("returns matches in a stable order whatever the map order", () => {
    const a = completePrefix("c", COMMANDS).matches;
    const b = completePrefix("c", [...COMMANDS].reverse()).matches;
    expect(a).toEqual(b);
  });
});

/**
 * The screen's height: the author's when written, otherwise the stylesheet's,
 * which grows it with the lesson's block (globals.css). Drawn on the server,
 * where xterm does not start: only the frame is looked at.
 */
describe("the terminal's screen height", () => {
  const screenHeight = (props: Record<string, unknown>): string | false => {
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(createElement(SimulatedTerminal, props));
    const screenEl = host.querySelector(".sim-terminal__screen");
    return screenEl instanceof HTMLElement && screenEl.style.height;
  };

  it("is left to the stylesheet when the author wrote none", () => {
    expect(screenHeight({})).toBe("");
  });

  it("is the author's, written on the screen, when there is one", () => {
    expect(screenHeight({ height: 420 })).toBe("420px");
  });
});
