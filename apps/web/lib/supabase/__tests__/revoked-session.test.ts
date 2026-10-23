import { describe, expect, it } from "vitest";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { isAuthApiError, isAuthSessionMissingError } from "@supabase/supabase-js";

/**
 * The premise of the middleware's session check (middleware.ts,
 * checkSessionOnServer), against the real clients instead of the mock the
 * middleware tests use: when the auth server no longer has a session, getUser()
 * answers "no user" with the error class the middleware reads as "gone"
 * (AuthSessionMissingError) AND the cookie removals have been handed to
 * `setAll` by the time it resolves, so the response the middleware builds there
 * carries them. A deleted account is the other "gone": GoTrue answers
 * "user_not_found", which auth-js hands back as a plain AuthApiError and does
 * not sign out. Should an upgrade of auth-js or @supabase/ssr change any of
 * that, a signed-out browser would go back to looping between /login and
 * /dashboard (or the middleware would call a dead session "unreachable"), and
 * this is the test that says so.
 */

function base64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

/** A session cookie whose token has an hour to live, as GoTrue issues them. */
function sessionCookie(): { name: string; value: string } {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const token = [
    base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" })),
    base64Url(JSON.stringify({ sub: "u1", exp: expiresAt, session_id: "s1", aal: "aal1" })),
    "signature",
  ].join(".");
  const session = {
    access_token: token,
    refresh_token: "refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    user: { id: "u1", aud: "authenticated", app_metadata: {}, user_metadata: {} },
  };
  // The project reference is the first label of the host: sb-<ref>-auth-token.
  return { name: "sb-example-auth-token", value: `base64-${base64Url(JSON.stringify(session))}` };
}

function gotrueRefusal(errorCode: string, msg: string): typeof fetch {
  return () =>
    Promise.resolve(
      new Response(JSON.stringify({ code: 403, error_code: errorCode, msg }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    );
}

/** GoTrue's answer for a token whose session_id is no longer in auth.sessions. */
const sessionNotFound = gotrueRefusal(
  "session_not_found",
  "Session from session_id claim in JWT does not exist",
);

/** GoTrue's answer for a token whose `sub` is an account that was deleted. */
const userNotFound = gotrueRefusal("user_not_found", "User from sub claim in JWT does not exist");

/**
 * The server client as the middleware builds it: the cookies the browser sent
 * come out of `getAll`, and what the client wants written goes to `setAll`.
 */
function serverClient(
  setAll: CookieMethodsServer["setAll"] = () => undefined,
  answer: typeof fetch = sessionNotFound,
) {
  const cookies: CookieMethodsServer = { getAll: () => [sessionCookie()], setAll };
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  return createServerClient("https://example.supabase.co", "anon-key", {
    cookies,
    global: { fetch: answer },
  });
}

describe("a session deleted on the auth server", () => {
  it("is still a session to getSession(), which only reads the cookie", async () => {
    const { data } = await serverClient().auth.getSession();

    expect(data.session?.user.id).toBe("u1");
  });

  it("is no user to getUser(), and its cookie is dropped before the answer comes back", async () => {
    const written: { name: string; value: string }[] = [];
    const client = serverClient((cookies) => {
      written.push(...cookies);
    });

    const { data, error } = await client.auth.getUser();

    expect(data.user).toBeNull();
    // The class the middleware reads as "gone": any other error is "unreachable".
    expect(isAuthSessionMissingError(error)).toBe(true);
    expect(written).toEqual([
      expect.objectContaining({ name: "sb-example-auth-token", value: "" }),
    ]);
  });
});

describe("an account deleted on the auth server", () => {
  it("is no user to getUser(), as a plain API error that carries user_not_found", async () => {
    const written: { name: string; value: string }[] = [];
    const client = serverClient((cookies) => {
      written.push(...cookies);
    }, userNotFound);

    const { data, error } = await client.auth.getUser();

    expect(data.user).toBeNull();
    expect(isAuthSessionMissingError(error)).toBe(false);
    expect(isAuthApiError(error) && error.code).toBe("user_not_found");
    // auth-js does not sign this one out: the cookie is left for its token to
    // outlive, which is why the middleware must not rely on dropping it.
    expect(written).toEqual([]);
  });
});
