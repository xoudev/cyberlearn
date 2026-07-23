"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { getRequestUser } from "@/lib/auth";
import { checkContactForm } from "@/lib/rate-limit";

const contactSchema = z.object({
  subject: z.string().trim().min(5).max(200),
  theme: z.enum(["BUG", "QUESTION", "FEATURE_REQUEST", "SECURITY", "CONTENT_ERROR", "OTHER"]),
  message: z.string().trim().min(20).max(5000),
  email: z.string().email(),
});

// Behavioural anti-spam. The IP rate limit alone doesn't stop distributed
// bots (they rotate IPs and emails), so we also reject on two bot tells:
//  - the honeypot field, hidden from humans but filled by form-scraping bots
//  - a submission faster than a human could plausibly fill the form
// Both cases return success silently so the bot gets no signal to adapt.
const HONEYPOT_FIELD = "website";
const TIMESTAMP_FIELD = "loaded_at";
const MIN_FILL_MS = 2500;

export interface ContactFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof contactSchema>, string>>;
}

export async function submitContactAction(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  // Honeypot: real users never see this field, so any value means a bot.
  const honeypotRaw = formData.get(HONEYPOT_FIELD);
  if (typeof honeypotRaw === "string" && honeypotRaw.trim() !== "") return { success: true };

  // Time trap: a genuine visitor can't read and fill the form in a blink.
  // Only enforced when the timestamp is present (JS-disabled users have none).
  const loadedAtRaw = formData.get(TIMESTAMP_FIELD);
  const loadedAt = typeof loadedAtRaw === "string" ? Number.parseInt(loadedAtRaw, 10) : Number.NaN;
  if (Number.isFinite(loadedAt) && Date.now() - loadedAt < MIN_FILL_MS) {
    return { success: true };
  }

  const raw = {
    subject: formData.get("subject"),
    theme: formData.get("theme"),
    message: formData.get("message"),
    email: formData.get("email"),
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: ContactFormState["fieldErrors"] = {};
    for (const [field, errs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      const key = field as keyof typeof fieldErrors;
      if (errs[0]) fieldErrors[key] = errs[0];
    }
    return { error: "Formulaire invalide.", fieldErrors };
  }

  const headerStore = await headers();
  const rawIp = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // Rate limit MUST come before any Turnstile captcha check (added in a future phase)
  // so that an attacker cannot burn captcha quota at no cost
  const contactLimit = await checkContactForm(rawIp);
  if (!contactLimit.success) {
    return {
      error: `Trop de demandes. Réessayez dans ${String(contactLimit.retryAfterSeconds)} secondes.`,
    };
  }

  const { subject, theme, message, email } = parsed.data;

  // Get logged-in user if any (contact is also available to guests)
  const authUser = await getRequestUser();

  await prisma.contactTicket.create({
    data: {
      subject,
      theme,
      message,
      email,
      userId: authUser?.id ?? null,
      status: "OPEN",
    },
  });

  return { success: true };
}
