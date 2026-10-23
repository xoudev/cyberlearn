import { describe, expect, it } from "vitest";
import { firstNonEmpty } from "../public-env";

describe("firstNonEmpty", () => {
  it("takes the first candidate that has something in it", () => {
    expect(firstNonEmpty("https://a.example", "https://b.example")).toBe("https://a.example");
  });

  it("passes over unset and empty candidates, as `||` did", () => {
    expect(firstNonEmpty(undefined, "", "https://b.example")).toBe("https://b.example");
    expect(firstNonEmpty(null, "https://b.example")).toBe("https://b.example");
  });

  it("ignores what is not a string rather than reading it as a URL", () => {
    expect(firstNonEmpty(0, false, {}, "fallback")).toBe("fallback");
  });

  it("is empty when nothing is set", () => {
    expect(firstNonEmpty()).toBe("");
    expect(firstNonEmpty(undefined, "")).toBe("");
  });
});
