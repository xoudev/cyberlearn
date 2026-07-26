export const MOBILE_AUTH_CALLBACK_URL = "cyberlearn://auth-callback";

export type MobileOAuthCallbackResult =
  | { status: "success"; code: string }
  | { status: "provider_error"; message: string }
  | { status: "invalid_callback" };

/**
 * Accepts only the callback owned by the native app and only a PKCE code.
 * Access and refresh tokens must never transit through a custom-scheme URL.
 */
export function parseMobileOAuthCallback(url: string): MobileOAuthCallbackResult {
  let callback: URL;
  try {
    callback = new URL(url);
  } catch {
    return { status: "invalid_callback" };
  }

  const isExpectedCallback =
    callback.protocol === "cyberlearn:" &&
    callback.hostname === "auth-callback" &&
    (callback.pathname === "" || callback.pathname === "/");
  if (!isExpectedCallback || callback.username || callback.password || callback.port) {
    return { status: "invalid_callback" };
  }

  const providerError =
    callback.searchParams.get("error_description") ?? callback.searchParams.get("error");
  if (providerError) {
    return { status: "provider_error", message: providerError };
  }

  const code = callback.searchParams.get("code");
  if (!code || code.length > 2048 || callback.hash.length > 0) {
    return { status: "invalid_callback" };
  }

  return { status: "success", code };
}
