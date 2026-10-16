import { describe, expect, it } from "vitest";
import { isCertifiablePath } from "./certificate.js";

describe("isCertifiablePath", () => {
  it("certifies a catalogue path", () => {
    expect(isCertifiablePath({ audience: "CATALOGUE" })).toBe(true);
  });

  it("never certifies a path built for a class, which the server would refuse", () => {
    expect(isCertifiablePath({ audience: "CLASS" })).toBe(false);
  });
});
