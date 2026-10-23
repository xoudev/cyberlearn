"use server";

import { headers } from "next/headers";
import { getRequestUser } from "@/lib/auth";
import {
  isTicketFormTheme,
  TICKET_MESSAGE_MAX,
  TICKET_SUBJECT_MAX,
} from "@cyberlearn/lib/tickets/tickets";
import { fileTicket, type TicketField } from "@/lib/tickets/requester";

// Behavioural anti-spam. The IP rate limit alone doesn't stop distributed
// bots (they rotate IPs and emails), so we also reject on two bot tells:
//  - the honeypot field, hidden from humans but filled by form-scraping bots
//  - a submission faster than a human could plausibly fill the form
// Both cases return success silently so the bot gets no signal to adapt.
const HONEYPOT_FIELD = "website";
const TIMESTAMP_FIELD = "loaded_at";
const MIN_FILL_MS = 2500;
/** The longest address there is (RFC 5321): what the e-mail field can ever hold. */
const EMAIL_MAX = 254;

/** What the form held when it was sent. */
export interface ContactFormValues {
  email: string;
  /** A theme of the form, or "" for none: nothing else is handed back. */
  theme: string;
  subject: string;
  message: string;
}

export interface ContactFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<TicketField, string>>;
  /**
   * The fields as they were typed, handed back with every refusal. React
   * empties an uncontrolled form once its action has run: without these, a
   * refused message - a mistyped address, or the shared-IP rate limit, which
   * is no fault of the visitor - cost everything that had been written.
   */
  values?: ContactFormValues;
}

/** The theme that was chosen, if it is one the form offers. */
function chosenTheme(formData: FormData): string {
  const value = formData.get("theme");
  return typeof value === "string" && isTicketFormTheme(value) ? value : "";
}

/** A field as it was typed, never longer than the form lets it be. */
function typed(formData: FormData, name: string, max: number): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.slice(0, max) : "";
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

  const headerStore = await headers();
  const rawIp = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // Get logged-in user if any (contact is also available to guests)
  const authUser = await getRequestUser();

  // Validation, the rate limit (before any future captcha, so an attacker
  // cannot burn its quota for free) and the write: shared with the app.
  const result = await fileTicket({
    userId: authUser?.id ?? null,
    ip: rawIp,
    fields: {
      subject: formData.get("subject"),
      theme: formData.get("theme"),
      message: formData.get("message"),
      email: formData.get("email"),
    },
  });
  if (!result.ok) {
    const values: ContactFormValues = {
      email: typed(formData, "email", EMAIL_MAX),
      theme: chosenTheme(formData),
      subject: typed(formData, "subject", TICKET_SUBJECT_MAX),
      message: typed(formData, "message", TICKET_MESSAGE_MAX),
    };
    return result.fieldErrors
      ? { error: result.error, fieldErrors: result.fieldErrors, values }
      : { error: result.error, values };
  }

  return { success: true };
}
