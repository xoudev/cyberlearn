import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FileTicketResult } from "@/lib/tickets/requester";

/**
 * The contact form's action: the bot traps answer as if the message had been
 * sent, a refusal hands back what was typed (React empties the form once the
 * action has run), and a sent message hands back nothing.
 */

const m = vi.hoisted(() => ({
  getRequestUser: vi.fn<() => Promise<{ id: string } | null>>(),
  fileTicket: vi.fn<(input: unknown) => Promise<FileTicketResult>>(),
  forwardedFor: null as string | null,
}));

vi.mock("@/lib/auth", () => ({ getRequestUser: m.getRequestUser }));
vi.mock("@/lib/tickets/requester", () => ({ fileTicket: m.fileTicket }));
vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve(new Headers(m.forwardedFor ? { "x-forwarded-for": m.forwardedFor } : {})),
}));

const { submitContactAction } = await import("../contact-actions");

const FIELDS = {
  email: "jean@example.org",
  theme: "ESTABLISHMENT_REQUEST",
  subject: "Ajouter mon établissement",
  message: "Voici la liste demandée : nom, ville, type, site et un contact sur place.",
};

/** A form filled in long ago, so the time trap lets it through. */
function form(fields: Record<string, string> = FIELDS): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  data.set("loaded_at", String(Date.now() - 60_000));
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.forwardedFor = "203.0.113.7, 10.0.0.1";
  m.getRequestUser.mockResolvedValue(null);
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
      values: { email: FIELDS.email, subject: FIELDS.subject, message: FIELDS.message },
    });
  });

  it("hands back what was typed with the fields that were wrong", async () => {
    m.fileTicket.mockResolvedValue({
      ok: false,
      error: "Formulaire invalide.",
      fieldErrors: { email: "Adresse e-mail invalide." },
    });
    const state = await submitContactAction({}, form({ ...FIELDS, email: "jean@gmail" }));
    expect(state.fieldErrors).toEqual({ email: "Adresse e-mail invalide." });
    expect(state.values).toEqual({
      email: "jean@gmail",
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
    expect(state.values).toEqual({ email: "", subject: "Un sujet", message: "" });
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
});
