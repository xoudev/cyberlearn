import { describe, expect, it } from "vitest";
import { mfaPinVerdict } from "../mfa-pin";

/** The console's pinned factors against the ones the account has now. */

describe("mfaPinVerdict", () => {
  it("pins what it sees the first time", () => {
    expect(mfaPinVerdict([], ["f1"])).toBe("pin");
    expect(mfaPinVerdict([], ["f1", "f2"])).toBe("pin");
  });

  it("lets the same factors in, in any order", () => {
    expect(mfaPinVerdict(["f1"], ["f1"])).toBe("match");
    expect(mfaPinVerdict(["f1", "f2"], ["f2", "f1"])).toBe("match");
  });

  it("shuts on a factor swapped, removed or added", () => {
    expect(mfaPinVerdict(["f1"], ["f2"])).toBe("changed");
    expect(mfaPinVerdict(["f1", "f2"], ["f1"])).toBe("changed");
    expect(mfaPinVerdict(["f1"], ["f1", "f2"])).toBe("changed");
    expect(mfaPinVerdict(["f1"], [])).toBe("changed");
  });
});
