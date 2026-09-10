import { describe, expect, it } from "vitest";
import { completePrefix } from "../simulated-terminal";

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
