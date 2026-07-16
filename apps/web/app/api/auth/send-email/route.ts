import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authRedirectSchema } from "@cyberlearn/types";
import { sendMagicLinkEmail } from "@cyberlearn/email";
import type { EmailActionType } from "@cyberlearn/email";
import { env } from "@/lib/env";

const hookPayloadSchema = z.object({
  user: z.object({
    email: z.string().email(),
  }),
  email_data: z.object({
    token: z.string().optional(), // 6-digit OTP code (used by the mobile app)
    token_hash: z.string(),
    redirect_to: z.string(),
    email_action_type: z.string(),
  }),
});

/**
 * Extracts the local post-auth destination from the caller-supplied redirect.
 * Callers pass `redirect_to` as `${SITE_URL}/auth/callback?next=/reset-password`
 * (web + mobile reset, signup, ...); we forward only the validated `next` path
 * to `/auth/confirm` so the server-side OTP verification can honour it.
 */
function resolveNextPath(redirectTo: string): string {
  try {
    const inner = new URL(redirectTo).searchParams.get("next");
    return authRedirectSchema.safeParse(inner ?? "/dashboard").data ?? "/dashboard";
  } catch {
    return "/dashboard";
  }
}

async function verifyWebhookSignature(
  rawBody: string,
  webhookId: string,
  webhookTimestamp: string,
  webhookSignature: string,
): Promise<boolean> {
  // Reject stale webhooks (>5 minutes old)
  const ts = parseInt(webhookTimestamp, 10);
  if (Number.isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return false;
  }

  // Secret may be stored as "v1,whsec_<base64>", "whsec_<base64>", or plain base64
  const secretBase64 = env.SUPABASE_HOOK_SECRET.replace(/^v1,whsec_/, "").replace(/^whsec_/, "");
  const keyBytes = Uint8Array.from(atob(secretBase64), (c) => c.charCodeAt(0));

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedContent),
  );
  const expectedSig = btoa(
    Array.from(new Uint8Array(signatureBytes))
      .map((b) => String.fromCharCode(b))
      .join(""),
  );

  // webhook-signature may contain multiple space-separated "v1,<sig>" values
  return webhookSignature.split(" ").some((s) => {
    const [, sig] = s.split(",");
    return sig === expectedSig;
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return new NextResponse(null, { status: 400 });
    }

    const webhookId = request.headers.get("webhook-id");
    const webhookTimestamp = request.headers.get("webhook-timestamp");
    const webhookSignature = request.headers.get("webhook-signature");

    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      return new NextResponse(null, { status: 401 });
    }

    const valid = await verifyWebhookSignature(
      rawBody,
      webhookId,
      webhookTimestamp,
      webhookSignature,
    );
    if (!valid) {
      return new NextResponse(null, { status: 401 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({});
    }

    const parsed = hookPayloadSchema.safeParse(body);
    if (!parsed.success) {
      // Unknown hook event - acknowledge silently
      return NextResponse.json({});
    }

    const { user, email_data } = parsed.data;
    const { token, token_hash, redirect_to, email_action_type } = email_data;

    // Point straight at our server-side confirmation route rather than Supabase's
    // /auth/v1/verify implicit-flow endpoint: that endpoint returns the session in
    // a URL fragment a Route Handler can never read, so recovery/signup links died
    // at /auth/callback. /auth/confirm verifies token_hash with verifyOtp instead.
    const nextPath = resolveNextPath(redirect_to);
    const confirmUrl = new URL(`${env.NEXT_PUBLIC_SITE_URL}/auth/confirm`);
    confirmUrl.searchParams.set("token_hash", token_hash);
    confirmUrl.searchParams.set("type", email_action_type);
    confirmUrl.searchParams.set("next", nextPath);
    const magicLink = confirmUrl.toString();

    await sendMagicLinkEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL,
      to: user.email,
      magicLink,
      // SAFETY: email_action_type comes from Supabase schema, values match EmailActionType
      type: email_action_type as EmailActionType,
      code: token,
    });

    return NextResponse.json({});
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}
