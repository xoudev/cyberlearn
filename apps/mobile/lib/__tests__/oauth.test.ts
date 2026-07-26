import { describe, expect, it } from "vitest";
import { MOBILE_AUTH_CALLBACK_URL, parseMobileOAuthCallback } from "../oauth";

describe("parseMobileOAuthCallback", () => {
  it("accepts the native callback with a PKCE code", () => {
    expect(parseMobileOAuthCallback(`${MOBILE_AUTH_CALLBACK_URL}?code=one-time-code`)).toEqual({
      status: "success",
      code: "one-time-code",
    });
  });

  it("rejects callbacks for another scheme or host", () => {
    expect(parseMobileOAuthCallback("https://cyberlearn.fr/auth-callback?code=code")).toEqual({
      status: "invalid_callback",
    });
    expect(parseMobileOAuthCallback("cyberlearn://attacker?code=code")).toEqual({
      status: "invalid_callback",
    });
  });

  it("rejects implicit-flow tokens in the callback fragment", () => {
    expect(
      parseMobileOAuthCallback(
        `${MOBILE_AUTH_CALLBACK_URL}#access_token=secret&refresh_token=secret`,
      ),
    ).toEqual({ status: "invalid_callback" });
  });

  it("surfaces an OAuth provider error without accepting a session", () => {
    expect(
      parseMobileOAuthCallback(
        `${MOBILE_AUTH_CALLBACK_URL}?error=access_denied&error_description=Cancelled`,
      ),
    ).toEqual({ status: "provider_error", message: "Cancelled" });
  });
});
