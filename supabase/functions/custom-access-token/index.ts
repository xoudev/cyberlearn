/**
 * Supabase Auth Hook — Custom Access Token
 *
 * Injects the user's role from public.users into the JWT access token
 * as `user_role`. This enables role-based access control in:
 * - RLS policies (via current_user_role() SQL function)
 * - Server-side middleware and guards (via user.app_metadata.user_role)
 *
 * Setup:
 * 1. Deploy: `supabase functions deploy custom-access-token --no-verify-jwt`
 * 2. In Supabase dashboard → Authentication → Hooks:
 *    Enable "Customize Access Token (JWT)" → HTTPS → point to this function.
 * 3. Copy the signing secret shown by Supabase and set it in Edge Function secrets:
 *    supabase secrets set CUSTOM_ACCESS_TOKEN_SECRET="v1,whsec_..."
 *
 * Docs: https://supabase.com/docs/guides/auth/auth-hooks#custom-access-token-hook
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface WebhookPayload {
  user_id: string;
  claims: Record<string, unknown>;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

/**
 * Verifies the HMAC-SHA256 signature Supabase sends in the Authorization header.
 * Header format:  Authorization: v1,<hmac-sha256-hex>
 * Secret format:  v1,whsec_<base64-encoded-key>
 */
async function verifyHookSignature(body: string, authHeader: string): Promise<boolean> {
  const secret = Deno.env.get("CUSTOM_ACCESS_TOKEN_SECRET") ?? "";
  if (!secret) {
    console.warn(
      "[custom-access-token] CUSTOM_ACCESS_TOKEN_SECRET not set — skipping verification",
    );
    return true;
  }

  try {
    const base64Key = secret.replace(/^v1,whsec_/, "");
    const keyBytes = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    if (!authHeader.startsWith("v1,")) return false;
    const signatureHex = authHeader.slice(3);
    const signatureBytes = new Uint8Array(
      (signatureHex.match(/../g) ?? []).map((h) => parseInt(h, 16)),
    );

    return await crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      signatureBytes,
      new TextEncoder().encode(body),
    );
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  let claims: Record<string, unknown> = {};

  try {
    const body = await req.text();

    const authHeader = req.headers.get("authorization") ?? "";
    const valid = await verifyHookSignature(body, authHeader);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(body) as WebhookPayload;
    claims = payload.claims ?? {};

    const userId = payload.user_id;
    if (!userId) {
      return new Response(JSON.stringify({ claims }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single<{ role: string }>();

    if (error || !user) {
      // User row may not exist yet (first login before /auth/callback creates it)
      return new Response(JSON.stringify({ claims }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const enrichedClaims = {
      ...claims,
      app_metadata: {
        ...(claims["app_metadata"] as Record<string, unknown> | undefined),
        user_role: user.role,
      },
    };

    return new Response(JSON.stringify({ claims: enrichedClaims }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[custom-access-token] unhandled error:", err);
    return new Response(JSON.stringify({ claims }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
