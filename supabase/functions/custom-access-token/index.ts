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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type HookDeps, handleHookRequest } from "./handler.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const prodDeps: HookDeps = {
  getEnv: (key) => Deno.env.get(key),
  lookupRole: async (userId) => {
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single<{ role: string }>();
    return error || !data ? null : data.role;
  },
};

Deno.serve((req: Request) => handleHookRequest(req, prodDeps));
