import { describe, expect, it } from "vitest";
import { classifySignUpError } from "@/lib/auth/sign-up-error";

describe("classifySignUpError", () => {
  it("recognizes the Supabase email rate-limit code", () => {
    expect(classifySignUpError({ code: "over_email_send_rate_limit", status: 429 })).toBe(
      "email_rate_limit",
    );
  });

  it("falls back to the HTTP status for rate-limit errors", () => {
    expect(classifySignUpError({ status: 429 })).toBe("email_rate_limit");
  });

  it("recognizes invalid email addresses", () => {
    expect(classifySignUpError({ code: "email_address_invalid", status: 400 })).toBe(
      "invalid_email",
    );
  });

  it("keeps unexpected Supabase errors generic", () => {
    expect(classifySignUpError({ code: "unexpected_failure", status: 500 })).toBe("unknown");
  });
});
