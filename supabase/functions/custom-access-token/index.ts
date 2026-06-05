/**
 * Supabase Auth Hook — Custom Access Token
 *
 * Injects the user's role from public.users into the JWT access token
 * as `user_role`. This enables role-based access control in:
 * - RLS policies (via current_user_role() SQL function)
 * - Server-side middleware and guards (via user.app_metadata.user_role)
 *
 * Security: every call is authenticated with the Standard Webhooks signature
 * GoTrue attaches (webhook-id / webhook-timestamp / webhook-signature), signed
 * with the secret configured under Auth → Hooks. Unsigned / invalid / expired
 * calls are rejected with 401 BEFORE any database lookup. This hook is on the
 * JWT issuance path (login + refresh), so it FAILS CLOSED — validate end-to-end
 * before prod.
 *
 * Setup:
 * 1. Deploy: `supabase functions deploy custom-access-token --no-verify-jwt`
 *    (config.toml also pins `verify_jwt = false` so a future deploy without the
 *    flag does not silently re-break the hook.)
 * 2. In Supabase dashboard → Authentication → Hooks:
 *    Enable "Customize Access Token (JWT)" → HTTPS → point to this function.
 * 3. Copy the signing secret shown by Supabase and set it as an Edge Function
 *    secret (NOT prefixed with SUPABASE_, which the CLI reserves):
 *    supabase secrets set CUSTOM_ACCESS_TOKEN_SECRET="v1,whsec_..."
 *
 * Docs: https://supabase.com/docs/guides/auth/auth-hooks#custom-access-token-hook
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignatureError, verifyHookSignature } from "./verify.ts";

interface WebhookPayload {
  user_id: string;
  claims: Record<string, unknown>;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  let claims: Record<string, unknown> = {};

  try {
    const body = await req.text();

    // ── Authenticate the call (fail closed) ──────────────────────────────────
    const secret = Deno.env.get("CUSTOM_ACCESS_TOKEN_SECRET") ?? "";
    if (!secret) {
      // Server misconfiguration — refuse to run unverified rather than fail open.
      console.error("[custom-access-token] CUSTOM_ACCESS_TOKEN_SECRET is not set");
      return jsonResponse({ error: "hook not configured" }, 500);
    }
    try {
      verifyHookSignature(secret, body, {
        id: req.headers.get("webhook-id") ?? "",
        timestamp: req.headers.get("webhook-timestamp") ?? "",
        signature: req.headers.get("webhook-signature") ?? "",
      });
    } catch (err) {
      if (err instanceof SignatureError) {
        console.warn("[custom-access-token] signature rejected:", err.message);
        return jsonResponse({ error: "invalid signature" }, 401);
      }
      throw err;
    }

    // ── Enrich claims with the DB-derived role (unchanged) ───────────────────
    const payload = JSON.parse(body) as WebhookPayload;
    claims = payload.claims ?? {};

    const userId = payload.user_id;
    if (!userId) {
      return jsonResponse({ claims });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single<{ role: string }>();

    if (error || !user) {
      // User row may not exist yet (first login before /auth/callback creates it)
      return jsonResponse({ claims });
    }

    const enrichedClaims = {
      ...claims,
      app_metadata: {
        ...(claims["app_metadata"] as Record<string, unknown> | undefined),
        user_role: user.role,
      },
    };

    return jsonResponse({ claims: enrichedClaims });
  } catch (err) {
    console.error("[custom-access-token] unhandled error:", err);
    // Unexpected (non-signature) error: return claims unchanged rather than
    // 500-ing the whole auth flow.
    return jsonResponse({ claims });
  }
});
