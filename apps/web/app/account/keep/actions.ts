"use server";

import { redirect } from "next/navigation";
import { keepAccountByToken } from "@cyberlearn/db";
import { hashKeepToken, keepTokenSchema } from "@/lib/rgpd/keep-token";

/**
 * The "Garder mon compte" button of an inactivity notice. No session needed:
 * the link is the proof, and the person may well have forgotten their
 * password in two years. A link that does not hold, malformed or already used,
 * lands on the same page as one that does, with the other message.
 */
export async function keepAccountAction(formData: FormData): Promise<never> {
  const token = keepTokenSchema.safeParse(formData.get("token"));
  const kept =
    token.success && (await keepAccountByToken(hashKeepToken(token.data), new Date())) !== null;
  redirect(`/account/keep/done?kept=${kept ? "1" : "0"}`);
}
