import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FileTicketResult } from "@/lib/tickets/requester";

/**
 * The contact form's action.
 *
 * It is open to visitors and, since the middleware lets a session that still
 * owes its second-factor code reach it, to sessions that have typed the
 * password and nothing else: whose request it is depends on which. The bot
 * traps answer as if the message had been sent, a refusal hands back what was
 * typed (React empties the form once the action has run), and a sent message
 * hands back nothing.
 */

const m = vi.hoisted(() => ({
  getRequestUser: vi.fn<() => Promise<{ id: string } | null>>(),
  getAssuranceLevel: vi.fn(),
  fileTicket: vi.fn<(input: unknown) => Promise<FileTicketResult>>(),
  forwardedFor: null as string | null,
}));

vi.mock("@/lib/auth", () => ({ getRequestUser: m.getRequestUser }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () =>
    Promise.resolve({ auth: { mfa: { getAuthenticatorAssuranceLevel: m.getAssuranceLevel } } }),
}));
vi.mock("@/lib/tickets/requester", () => ({ fileTicket: m.fileTicket }));
vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve(new Headers(m.forwardedFor ? { "x-forwarded-for": m.forwardedFor } : {})),
}));
// password-flow, where the rule for "must the code be typed" lives, reaches for
// the database to sync profiles; this action does not.
vi.mock("@cyberlearn/db", () => ({ userRepository: {} }));

const { submitContactAction } = await import("../contact-actions");

const FIELDS = {
  email: "jean@example.org",
  theme: "ESTABLISHMENT_REQUEST",
  subject: "Ajouter mon établissement",
  message: "Voici la liste demandée : nom, ville, type, site et un contact sur place.",
};

/** What somebody who lost the phone writes from the code screen. */
const LOST_PHONE_FIELDS = {
  email: "eleve@example.com",
  theme: "SECURITY",
  subject: "Double authentification retirée",
  message: "Je n’ai plus mon téléphone et je ne peux plus entrer le code.",
};

/** A form filled in long ago, so the time trap lets it through. */
function form(fields: Record<string, string> = FIELDS): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  data.set("loaded_at", String(Date.now() - 60_000));
  return data;
}

const levels = (currentLevel: string, nextLevel: string) => ({
  data: { currentLevel, nextLevel },
  error: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  m.forwardedFor = "203.0.113.7, 10.0.0.1";
  m.getRequestUser.mockResolvedValue(null);
  m.getAssuranceLevel.mockResolvedValue(levels("aal1", "aal1"));
});

describe("submitContactAction", () => {
  it("says it is sent, and hands nothing back", async () => {
    m.fileTicket.mockResolvedValue({ ok: true, ticketId: "t-1" });
    expect(await submitContactAction({}, form())).toEqual({ success: true });
    expect(m.fileTicket).toHaveBeenCalledWith({
      userId: null,
      ip: "203.0.113.7",
      fields: {
        subject: FIELDS.subject,
        theme: FIELDS.theme,
        message: FIELDS.message,
        email: FIELDS.email,
      },
    });
  });

  it("hands back what was typed when the limit per IP stops a valid message", async () => {
    m.fileTicket.mockResolvedValue({
      ok: false,
      error: "Trop de demandes. Réessaie dans 30 secondes.",
    });
    expect(await submitContactAction({}, form())).toEqual({
      error: "Trop de demandes. Réessaie dans 30 secondes.",
      values: {
        email: FIELDS.email,
        theme: FIELDS.theme,
        subject: FIELDS.subject,
        message: FIELDS.message,
      },
    });
  });

  it("hands back what was typed with the fields that were wrong", async () => {
    m.fileTicket.mockResolvedValue({
      ok: false,
      error: "Formulaire invalide.",
      fieldErrors: { email: "Adresse e-mail invalide." },
    });
    const state = await submitContactAction({}, form({ ...FIELDS, email: "jean@gmail" }));
    expect(state.error).toBe("Formulaire invalide.");
    expect(state.fieldErrors).toEqual({ email: "Adresse e-mail invalide." });
    expect(state.values).toEqual({
      email: "jean@gmail",
      theme: FIELDS.theme,
      subject: FIELDS.subject,
      message: FIELDS.message,
    });
  });

  it("hands back nothing longer than the form lets a field be", async () => {
    m.fileTicket.mockResolvedValue({ ok: false, error: "Formulaire invalide." });
    const state = await submitContactAction(
      {},
      form({ ...FIELDS, subject: "s".repeat(500), message: "m".repeat(9000) }),
    );
    expect(state.values?.subject).toHaveLength(200);
    expect(state.values?.message).toHaveLength(5000);
  });

  it("hands back an empty field for one the form never sent", async () => {
    m.fileTicket.mockResolvedValue({ ok: false, error: "Formulaire invalide." });
    const data = new FormData();
    data.set("subject", "Un sujet");
    const state = await submitContactAction({}, data);
    expect(state.values).toEqual({ email: "", theme: "", subject: "Un sujet", message: "" });
  });

  it("hands back a theme the form offers, and no other", async () => {
    m.fileTicket.mockResolvedValue({ ok: false, error: "Formulaire invalide." });
    for (const theme of ["BUG", "OTHER"]) {
      const state = await submitContactAction({}, form({ ...FIELDS, theme }));
      expect(state.values?.theme).toBe(theme);
    }
    // A theme the form never lists (an appeal is filed from the ban notice) or
    // anything else a hand-made request carries is not echoed into the page.
    for (const theme of ["BAN_APPEAL", "<script>", ""]) {
      const state = await submitContactAction({}, form({ ...FIELDS, theme }));
      expect(state.values?.theme).toBe("");
    }
  });

  it("answers a bot as if it had been sent, without filing anything", async () => {
    const trapped = form();
    trapped.set("website", "http://spam.example");
    expect(await submitContactAction({}, trapped)).toEqual({ success: true });

    const tooFast = form();
    tooFast.set("loaded_at", String(Date.now()));
    expect(await submitContactAction({}, tooFast)).toEqual({ success: true });
    expect(m.fileTicket).not.toHaveBeenCalled();
  });

  describe("whose request it is", () => {
    beforeEach(() => {
      m.fileTicket.mockResolvedValue({ ok: true, ticketId: "t1" });
    });

    it("files a visitor's request without an account", async () => {
      const state = await submitContactAction({}, form(LOST_PHONE_FIELDS));

      expect(state).toEqual({ success: true });
      expect(m.fileTicket).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null, ip: "203.0.113.7" }),
      );
    });

    it("attaches the request to the account of somebody who is signed in", async () => {
      m.getRequestUser.mockResolvedValue({ id: "u1" });
      m.getAssuranceLevel.mockResolvedValue(levels("aal1", "aal1"));

      await submitContactAction({}, form(LOST_PHONE_FIELDS));

      expect(m.fileTicket).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1" }));
    });

    it("attaches it too once the second factor was typed", async () => {
      m.getRequestUser.mockResolvedValue({ id: "u1" });
      m.getAssuranceLevel.mockResolvedValue(levels("aal2", "aal2"));

      await submitContactAction({}, form(LOST_PHONE_FIELDS));

      expect(m.fileTicket).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1" }));
    });

    it("files a session that still owes its code as a visitor's, not as the account's", async () => {
      // Somebody who lost the phone files from the code screen. Somebody who only
      // has the password could file the same way, and must not be read as the
      // owner asking for the factor to be removed.
      m.getRequestUser.mockResolvedValue({ id: "u1" });
      m.getAssuranceLevel.mockResolvedValue(levels("aal1", "aal2"));

      const state = await submitContactAction({}, form(LOST_PHONE_FIELDS));

      expect(state).toEqual({ success: true });
      expect(m.fileTicket).toHaveBeenCalledWith(expect.objectContaining({ userId: null }));
    });

    it("files as a visitor's when the level cannot be read", async () => {
      m.getRequestUser.mockResolvedValue({ id: "u1" });
      m.getAssuranceLevel.mockResolvedValue({ data: null, error: new Error("unreachable") });

      await submitContactAction({}, form(LOST_PHONE_FIELDS));

      expect(m.fileTicket).toHaveBeenCalledWith(expect.objectContaining({ userId: null }));
    });

    it("does not look at the session of a visitor", async () => {
      await submitContactAction({}, form(LOST_PHONE_FIELDS));

      expect(m.getAssuranceLevel).not.toHaveBeenCalled();
    });

    it("hands back what was typed when a session that owes its code is refused", async () => {
      m.getRequestUser.mockResolvedValue({ id: "u1" });
      m.getAssuranceLevel.mockResolvedValue(levels("aal1", "aal2"));
      m.fileTicket.mockResolvedValue({
        ok: false,
        error: "Formulaire invalide.",
        fieldErrors: { email: "Adresse invalide." },
      });

      const state = await submitContactAction({}, form(LOST_PHONE_FIELDS));

      expect(m.fileTicket).toHaveBeenCalledWith(expect.objectContaining({ userId: null }));
      expect(state).toEqual({
        error: "Formulaire invalide.",
        fieldErrors: { email: "Adresse invalide." },
        values: LOST_PHONE_FIELDS,
      });
    });
  });
});
