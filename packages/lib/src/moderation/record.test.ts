import { describe, expect, it } from "vitest";
import { moderationOutcome } from "./record.js";

describe("moderationOutcome", () => {
  it("words each decision", () => {
    expect(moderationOutcome("PENDING").label).toBe("En attente d'un modérateur");
    expect(moderationOutcome("OVERTURNED").label).toBe("Fausse alerte · rétabli");
    expect(moderationOutcome("UPHELD").label).toBe("Confirmé · supprimé");
  });

  it("reads anything it does not know as still waiting, never as a verdict", () => {
    expect(moderationOutcome("ESCALATED")).toEqual(moderationOutcome("PENDING"));
    expect(moderationOutcome("")).toEqual(moderationOutcome("PENDING"));
  });
});
