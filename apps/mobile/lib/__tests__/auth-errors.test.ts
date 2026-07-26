import { describe, expect, it } from "vitest";
import { isInvalidRefreshTokenError } from "../auth-errors";

describe("isInvalidRefreshTokenError", () => {
  it("recognizes Supabase refresh-token error codes", () => {
    expect(isInvalidRefreshTokenError({ code: "refresh_token_not_found" })).toBe(true);
    expect(isInvalidRefreshTokenError({ code: "REFRESH_TOKEN_ALREADY_USED" })).toBe(true);
  });

  it("recognizes the legacy Supabase error message", () => {
    expect(
      isInvalidRefreshTokenError({
        message: "Invalid Refresh Token: Refresh Token Not Found",
      }),
    ).toBe(true);
  });

  it("does not sign users out for network failures", () => {
    expect(isInvalidRefreshTokenError(new Error("Network request failed"))).toBe(false);
    expect(isInvalidRefreshTokenError(null)).toBe(false);
  });
});
