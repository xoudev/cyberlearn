/**
 * Supabase Auth Hook - Custom Access Token
 *
 * Injects the user's role from public.users into the JWT access token as
 * `user_role`, used by RLS policies (current_user_role()) and server guards
 * (user.app_metadata.user_role).
 *
 * Each GoTrue call is authenticated with its Standard Webhooks signature
 * (webhook-id / webhook-timestamp / webhook-signature), signed with the secret
 * configured under Auth → Hooks. Behaviour is controlled by HOOK_VERIFY_ENFORCE
 * (default "false"):
 *   - "false" (MONITOR): verify + log only, always return claims (zero issuance
 *     impact). Use to validate the secret against real traffic.
 *   - "true"  (ENFORCE): reject unsigned/invalid/expired calls with 401 before
 *     the role lookup; 500 (fail closed) if the secret is unconfigured.
 * This hook is on the JWT issuance path (login + refresh) - roll out monitor →
 * enforce once the logs confirm 100% of real calls verify.
 *
 * Setup:
 * 1. Deploy: `supabase functions deploy custom-access-token --no-verify-jwt`
 *    (config.toml also pins `verify_jwt = false`.)
 * 2. Dashboard → Authentication → Hooks → enable "Customize Access Token (JWT)"
 *    → HTTPS → point to this function.
 * 3. Set the signing secret (NOT prefixed with the reserved SUPABASE_):
 *    supabase secrets set CUSTOM_ACCESS_TOKEN_SECRET="v1,whsec_..."
 *    (Optionally HOOK_VERIFY_ENFORCE=true once validated in monitor mode.)
 *
 * Docs: https://supabase.com/docs/guides/auth/auth-hooks#custom-access-token-hook
 */

import { type HookDeps, handleHookRequest } from "./handler.ts";

// This function sits on the JWT issuance path: it runs on every login and every
// token refresh. It used to import the whole supabase-js client from esm.sh at
// module scope, which on a cold start means fetching that module and its
// dependency graph over the network before a single line runs - seconds, paid
// by whoever happens to log in first after a quiet period.
//
// It exists to answer one question: what is this user's role. That is one row,
// one column, and PostgREST answers it over plain fetch with no dependency at
// all. Nothing to download, nothing to compile, no version to pin.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/** Past this, issue the token without the claim rather than hold up the login. */
const ROLE_LOOKUP_TIMEOUT_MS = 2_000;

const prodDeps: HookDeps = {
  getEnv: (key) => Deno.env.get(key),
  lookupRole: async (userId) => {
    if (!SUPABASE_URL || !SERVICE_KEY) return null;

    try {
      const url = `${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=role`;
      const response = await fetch(url, {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          // Ask PostgREST for the object rather than a one-element array, the
          // equivalent of .single() - and a 406 when there is no such user.
          Accept: "application/vnd.pgrst.object+json",
        },
        signal: AbortSignal.timeout(ROLE_LOOKUP_TIMEOUT_MS),
      });
      if (!response.ok) return null;

      const row: unknown = await response.json();
      const role = (row as { role?: unknown } | null)?.role;
      return typeof role === "string" ? role : null;
    } catch {
      // A failed lookup returns the claims unchanged (see handler.ts), so the
      // worst case is a token without user_role - never a login that hangs.
      return null;
    }
  },
};

Deno.serve((req: Request) => handleHookRequest(req, prodDeps));
