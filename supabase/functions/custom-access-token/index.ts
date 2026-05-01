/**
 * Supabase Auth Hook — Custom Access Token
 *
 * Injects the user's role from public.users into the JWT access token
 * as `user_role`. This enables role-based access control in:
 * - RLS policies (via current_user_role() SQL function)
 * - Server-side middleware and guards (via user.app_metadata.user_role)
 *
 * Setup:
 * 1. Deploy this function: `supabase functions deploy custom-access-token`
 * 2. In Supabase dashboard → Authentication → Hooks:
 *    Enable "Customize Access Token (JWT)" → HTTPS → point to this function.
 * 3. Copy the signing secret Supabase shows and set it as:
 *    Edge Functions → custom-access-token → Secrets → CUSTOM_ACCESS_TOKEN_SECRET
 *
 * Docs: https://supabase.com/docs/guides/auth/auth-hooks#custom-access-token-hook
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface WebhookPayload {
  event: string;
  user_id: string;
  claims: Record<string, unknown>;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

/**
 * Verifies the Supabase HTTPS hook signature.
 * Supabase sends: Authorization: v1,<hmac-sha256-hex>
 * Secret format:  v1,whsec_<base64-encoded-key>
 */
async function verifyHookSignature(
  secret: string,
  body: string,
  authHeader: string,
): Promise<boolean> {
  try {
    const whsecPrefix = "v1,whsec_";
    if (!secret.startsWith(whsecPrefix)) return false;

    const base64Key = secret.slice(whsecPrefix.length);
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

    const bodyBytes = new TextEncoder().encode(body);
    return await crypto.subtle.verify("HMAC", cryptoKey, signatureBytes, bodyBytes);
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  const body = await req.text();
  const payload = JSON.parse(body) as WebhookPayload;
  const { user_id: userId, claims } = payload;

  // Fetch the user's role from public.users
  const { data: user, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single<{ role: string }>();

  if (error || !user) {
    // User row may not exist yet (first OAuth before callback creates it)
    // Return original claims unmodified — row will be created in /auth/callback
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
});
