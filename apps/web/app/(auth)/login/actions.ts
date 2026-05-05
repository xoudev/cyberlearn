"use server";

import { z } from "zod";
import { createSupabaseAdminClient } from "@cyberlearn/db/supabase/admin";
import { sendMagicLinkEmail } from "@cyberlearn/email";
import { env } from "@/lib/env";

const schema = z.object({
  email: z.string().email(),
  redirectTo: z
    .string()
    .regex(/^\/[a-zA-Z0-9/_-]*$/)
    .default("/dashboard"),
});

export async function sendMagicLink(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    redirectTo: formData.get("redirectTo") ?? "/dashboard",
  });

  if (!parsed.success) {
    return { error: "Adresse email invalide." };
  }

  const { email, redirectTo } = parsed.data;
  const callbackUrl = `${env.NEXT_PUBLIC_SITE_URL}/auth/callback`;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: callbackUrl },
  });

  if (error ?? !data.properties.action_link) {
    console.error("[sendMagicLink] generateLink error:", error);
    return { error: "Une erreur s'est produite. Veuillez réessayer." };
  }

  try {
    await sendMagicLinkEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL,
      to: email,
      magicLink: data.properties.action_link,
      type: "magiclink",
    });
  } catch (err) {
    console.error("[sendMagicLink] Resend error:", err);
    return { error: "Erreur lors de l'envoi. Veuillez réessayer." };
  }

  return { error: null };
}
