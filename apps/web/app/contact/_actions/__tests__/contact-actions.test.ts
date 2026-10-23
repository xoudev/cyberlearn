import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The contact form is open to visitors and, since the middleware lets a session
 * that still owes its second-factor code reach it, to sessions that have typed
 * the password and nothing else. Whose request it is depends on which.
 */

const mocks = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  getAssuranceLevel: vi.fn(),
  fileTicket: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })),
}));
vi.mock("@/lib/auth", () => ({ getRequestUser: mocks.getRequestUser }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () =>
    Promise.resolve({ auth: { mfa: { getAuthenticatorAssuranceLevel: mocks.getAssuranceLevel } } }),
}));
vi.mock("@/lib/tickets/requester", () => ({ fileTicket: mocks.fileTicket }));
// password-flow, where the rule for "must the code be typed" lives, reaches for
// the database to sync profiles; this action does not.
vi.mock("@cyberlearn/db", () => ({ userRepository: {} }));

const { submitContactAction } = await import("../contact-actions");

function form(extra: Record<string, string> = {}): FormData {
  const data = new FormData();
  data.set("subject", "Double authentification retirée");
  data.set("theme", "SECURITY");
  data.set("message", "Je n’ai plus mon téléphone et je ne peux plus entrer le code.");
  data.set("email", "eleve@example.com");
  for (const [key, value] of Object.entries(extra)) data.set(key, value);
  return data;
}

const levels = (currentLevel: string, nextLevel: string) => ({
  data: { currentLevel, nextLevel },
  error: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getRequestUser.mockResolvedValue(null);
  mocks.getAssuranceLevel.mockResolvedValue(levels("aal1", "aal1"));
  mocks.fileTicket.mockResolvedValue({ ok: true, ticketId: "t1" });
});

describe("submitContactAction", () => {
  it("files a visitor's request without an account", async () => {
    const state = await submitContactAction({}, form());

    expect(state).toEqual({ success: true });
    expect(mocks.fileTicket).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null, ip: "203.0.113.7" }),
    );
  });

  it("attaches the request to the account of somebody who is signed in", async () => {
    mocks.getRequestUser.mockResolvedValue({ id: "u1" });
    mocks.getAssuranceLevel.mockResolvedValue(levels("aal1", "aal1"));

    await submitContactAction({}, form());

    expect(mocks.fileTicket).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1" }));
  });

  it("attaches it too once the second factor was typed", async () => {
    mocks.getRequestUser.mockResolvedValue({ id: "u1" });
    mocks.getAssuranceLevel.mockResolvedValue(levels("aal2", "aal2"));

    await submitContactAction({}, form());

    expect(mocks.fileTicket).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1" }));
  });

  it("files a session that still owes its code as a visitor's, not as the account's", async () => {
    // Somebody who lost the phone files from the code screen. Somebody who only
    // has the password could file the same way, and must not be read as the
    // owner asking for the factor to be removed.
    mocks.getRequestUser.mockResolvedValue({ id: "u1" });
    mocks.getAssuranceLevel.mockResolvedValue(levels("aal1", "aal2"));

    const state = await submitContactAction({}, form());

    expect(state).toEqual({ success: true });
    expect(mocks.fileTicket).toHaveBeenCalledWith(expect.objectContaining({ userId: null }));
  });

  it("files as a visitor's when the level cannot be read", async () => {
    mocks.getRequestUser.mockResolvedValue({ id: "u1" });
    mocks.getAssuranceLevel.mockResolvedValue({ data: null, error: new Error("unreachable") });

    await submitContactAction({}, form());

    expect(mocks.fileTicket).toHaveBeenCalledWith(expect.objectContaining({ userId: null }));
  });

  it("does not look at the session of a visitor", async () => {
    await submitContactAction({}, form());

    expect(mocks.getAssuranceLevel).not.toHaveBeenCalled();
  });

  it("hands back what the form got wrong", async () => {
    mocks.fileTicket.mockResolvedValue({
      ok: false,
      error: "Formulaire invalide.",
      fieldErrors: { email: "Adresse invalide." },
    });

    const state = await submitContactAction({}, form());

    expect(state).toEqual({
      error: "Formulaire invalide.",
      fieldErrors: { email: "Adresse invalide." },
    });
  });

  it("answers a bot as it would a person, and files nothing", async () => {
    const state = await submitContactAction({}, form({ website: "https://spam.example" }));

    expect(state).toEqual({ success: true });
    expect(mocks.fileTicket).not.toHaveBeenCalled();
  });
});
