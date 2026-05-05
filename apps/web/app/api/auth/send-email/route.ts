import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendMagicLinkEmail } from "@cyberlearn/email";
import type { EmailActionType } from "@cyberlearn/email";
import { env } from "@/lib/env";

// Supabase signs the hook body with HMAC-SHA256.
// Secret format: "v1,whsec_<base64>"
// Authorization header format: "v1,<hex_signature>"
function verifySignature(rawBody: string, authHeader: string | null, secret: string): boolean {
  if (!authHeader) return false;
  try {
    const base64Secret = secret.replace("v1,whsec_", "");
    const keyBytes = Buffer.from(base64Secret, "base64");
    const signature = authHeader.replace("v1,", "");
    const expected = crypto.createHmac("sha256", keyBytes).update(rawBody).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

const hookPayloadSchema = z.object({
  user: z.object({
    email: z.string().email(),
  }),
  email_data: z.object({
    token_hash: z.string(),
    redirect_to: z.string(),
    email_action_type: z.string(),
  }),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    console.log("[send-email] auth header:", authHeader?.slice(0, 20));
    console.log("[send-email] secret prefix:", env.SUPABASE_HOOK_SECRET.slice(0, 15));
    if (!verifySignature(rawBody, authHeader, env.SUPABASE_HOOK_SECRET)) {
      console.log("[send-email] signature mismatch");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = hookPayloadSchema.safeParse(body);
    if (!parsed.success) {
      // Unknown hook event — acknowledge silently
      return NextResponse.json({ success: true });
    }

    const { user, email_data } = parsed.data;
    const { token_hash, redirect_to, email_action_type } = email_data;

    const magicLink = `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to)}`;

    await sendMagicLinkEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL,
      to: user.email,
      magicLink,
      type: email_action_type as EmailActionType,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-email] Unhandled error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
