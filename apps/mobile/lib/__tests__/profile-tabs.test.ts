import { describe, expect, it } from "vitest";
import { PROFILE_SUB_TABS, profileSubFrom, profileSubParam } from "../profile-tabs";

describe("profileSubFrom", () => {
  it("reads the sub-tab a link names, whatever its case", () => {
    expect(profileSubFrom("certificats")).toBe("Certificats");
    expect(profileSubFrom("Badges")).toBe("Badges");
    expect(profileSubFrom(["collection", "stats"])).toBe("Collection");
  });

  it("names none for no param, or one the profile does not have", () => {
    expect(profileSubFrom(undefined)).toBeNull();
    expect(profileSubFrom([])).toBeNull();
    expect(profileSubFrom("")).toBeNull();
    expect(profileSubFrom("duels")).toBeNull();
  });

  it("reads back every param it writes", () => {
    for (const sub of PROFILE_SUB_TABS) {
      expect(profileSubFrom(profileSubParam(sub))).toBe(sub);
    }
  });
});
