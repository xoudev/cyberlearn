import { describe, expect, it } from "vitest";
import { moduleRappelValue, parseRappelValue } from "../rappel-query";

/** ?rappel=: the day's recall, or a module's review named by its path and number. */

describe("the review window's value", () => {
  it("names a module's review by its number and its path", () => {
    const value = moduleRappelValue("linux-fondamentaux", 2);
    expect(value).toBe("module-2-linux-fondamentaux");
    expect(parseRappelValue(value)).toEqual({
      kind: "module",
      path: "linux-fondamentaux",
      module: 2,
    });
  });

  it("opens the day's recall for anything that names no module", () => {
    for (const value of [
      "1",
      "",
      "module-0-linux",
      "module-2-",
      "module-x-linux",
      "module-2-Linux",
    ]) {
      expect(parseRappelValue(value)).toEqual({ kind: "daily" });
    }
  });
});
