import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendMagicLinkEmail } from "@cyberlearn/email";
import type { EmailActionType } from "@cyberlearn/email";
import { env } from "@/lib/env";

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
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token !== env.SUPABASE_HOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = hookPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { user, email_data } = parsed.data;
  const { token_hash, redirect_to, email_action_type } = email_data;

  const magicLink = `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to)}`;

  try {
    await sendMagicLinkEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL,
      to: user.email,
      magicLink,
      type: email_action_type as EmailActionType,
    });
  } catch (err) {
    console.error("[send-email] Failed to send:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
