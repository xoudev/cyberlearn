import { describe, expect, it } from "vitest";
import { errorMessage } from "../logger";

describe("errorMessage", () => {
  it("keeps only the message of an Error", () => {
    const err = Object.assign(new Error("Resend timeout"), { request: { to: "a@b.fr" } });
    expect(errorMessage(err)).toBe("Resend timeout");
  });

  it("reads the message of a plain error object, as Supabase returns them", () => {
    expect(errorMessage({ message: "row not found", code: "PGRST116" })).toBe("row not found");
  });

  it("falls back to the string form of anything else", () => {
    expect(errorMessage("boom")).toBe("boom");
    expect(errorMessage(42)).toBe("42");
    expect(errorMessage({ message: 3 })).toBe("[object Object]");
  });
});
