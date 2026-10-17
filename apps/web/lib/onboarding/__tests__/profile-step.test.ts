import { describe, expect, it } from "vitest";
import { EDIT_PROFILE_QUERY, profileStepView } from "@/lib/onboarding/profile-step";

const NAMED = { username: "ada", displayName: "Ada Lovelace", bio: "Première programmeuse." };

describe("profileStepView", () => {
  it("shows an empty form to an account that has no handle yet", () => {
    expect(profileStepView(null, {})).toEqual({ username: "", displayName: "", bio: "" });
  });

  it("keeps the name GitHub gave, but not the placeholder every account starts with", () => {
    expect(
      profileStepView({ username: null, displayName: "Ada Lovelace", bio: null }, {}),
    ).toMatchObject({ displayName: "Ada Lovelace" });
    expect(
      profileStepView({ username: null, displayName: "Utilisateur", bio: null }, {}),
    ).toMatchObject({ displayName: "" });
  });

  it("moves on to the avatar once the step is done", () => {
    expect(profileStepView(NAMED, {})).toBe("done");
  });

  // "← Retour" on the avatar step used to bounce straight back to it.
  it("shows the form again, filled, to somebody who came back from the avatar", () => {
    const params = Object.fromEntries(new URLSearchParams(EDIT_PROFILE_QUERY));
    expect(profileStepView(NAMED, params)).toEqual(NAMED);
  });

  it("ignores any other value of the edit flag", () => {
    expect(profileStepView(NAMED, { edit: "0" })).toBe("done");
    expect(profileStepView(NAMED, { edit: ["1", "1"] })).toBe("done");
  });
});
