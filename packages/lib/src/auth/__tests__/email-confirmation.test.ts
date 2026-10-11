import { describe, expect, it } from "vitest";
import { isEmailNotConfirmedError } from "../email-confirmation.js";

describe("isEmailNotConfirmedError", () => {
  it("recognises Supabase's error code", () => {
    expect(isEmailNotConfirmedError({ code: "email_not_confirmed", message: "x" })).toBe(true);
  });

  it("recognises the message of a server without error codes", () => {
    expect(isEmailNotConfirmedError({ message: "Email not confirmed" })).toBe(true);
  });

  it("does not take a wrong password for an unconfirmed address", () => {
    expect(
      isEmailNotConfirmedError({
        code: "invalid_credentials",
        message: "Invalid login credentials",
      }),
    ).toBe(false);
  });

  it("answers no for anything that is not an error object", () => {
    expect(isEmailNotConfirmedError(null)).toBe(false);
    expect(isEmailNotConfirmedError("email_not_confirmed")).toBe(false);
    expect(isEmailNotConfirmedError({ code: 42 })).toBe(false);
  });
});
