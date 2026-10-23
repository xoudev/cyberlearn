import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  create:
    vi.fn<
      (input: {
        subject: string;
        theme: string;
        message: string;
        email: string;
        userId: string | null;
      }) => Promise<{ id: string }>
    >(),
  findOwnedId: vi.fn<(ticketId: string, userId: string) => Promise<string | null>>(),
  findEmailById: vi.fn<(userId: string) => Promise<string | null>>(),
  addMessage:
    vi.fn<
      (input: unknown) => Promise<{ ok: true } | { ok: false; reason: "NOT_FOUND" | "TERMINAL" }>
    >(),
  checkContactForm:
    vi.fn<(ip: string) => Promise<{ success: boolean; retryAfterSeconds: number }>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  ticketRepository: { create: m.create, findOwnedId: m.findOwnedId, addMessage: m.addMessage },
  userRepository: { findEmailById: m.findEmailById },
}));
vi.mock("@/lib/rate-limit", () => ({
  checkContactForm: m.checkContactForm,
  // Replies spend from the shared budget for writes that notify somebody.
  checkNotifyingWrite: () => Promise.resolve({ success: true }),
}));

const { NO_REPLY_ADDRESS, fileAccountTicket, fileTicket, replyAsRequester } = await import(
  "../requester"
);

const TICKET_ID = "5b7c2d9e-1f3a-4c5b-8d7e-9f0a1b2c3d4e";
const FIELDS = {
  subject: "Vidéo muette",
  theme: "BUG",
  message: "La vidéo de la leçon 3 n'a pas de son sur mon téléphone.",
  email: "alex@example.org",
};

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.checkContactForm.mockResolvedValue({ success: true, retryAfterSeconds: 0 });
  m.create.mockResolvedValue({ id: TICKET_ID });
});

describe("fileTicket", () => {
  it("files a request for the account, open, and says which", async () => {
    expect(await fileTicket({ userId: "user-1", ip: "203.0.113.7", fields: FIELDS })).toEqual({
      ok: true,
      ticketId: TICKET_ID,
    });
    expect(m.create).toHaveBeenCalledWith({ ...FIELDS, userId: "user-1" });
    expect(m.checkContactForm).toHaveBeenCalledWith("203.0.113.7");
  });

  it("files a guest's request with no account", async () => {
    await fileTicket({ userId: null, ip: "x", fields: FIELDS });
    expect(m.create.mock.calls[0]?.[0].userId).toBeNull();
  });

  it("names each field that is wrong, before counting against the limit", async () => {
    const result = await fileTicket({
      userId: "user-1",
      ip: "x",
      fields: { subject: "Bug", theme: "BAN_APPEAL", message: "court", email: "pas-un-mail" },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual([
      "email",
      "message",
      "subject",
      "theme",
    ]);
    expect(result.fieldErrors?.theme).toBe("Choisis un thème.");
    expect(m.checkContactForm).not.toHaveBeenCalled();
    expect(m.create).not.toHaveBeenCalled();
  });

  it("refuses over the contact form's budget, and writes nothing", async () => {
    m.checkContactForm.mockResolvedValue({ success: false, retryAfterSeconds: 30 });
    expect(await fileTicket({ userId: "user-1", ip: "x", fields: FIELDS })).toEqual({
      ok: false,
      // In minutes and in the register of the rest of the site: "dans 900
      // secondes" is a sum to do, and "Réessayez" a switch to "vous" at the
      // moment the person is stopped.
      error: "Trop de demandes. Réessaie dans 1 minute.",
    });
    expect(m.create).not.toHaveBeenCalled();
  });
});

describe("fileAccountTicket", () => {
  const request = { subject: FIELDS.subject, theme: FIELDS.theme, message: FIELDS.message };
  const user = { id: "user-1", email: "session@example.org" };

  it("files as the account, answered at the profile's address, whatever the input says", async () => {
    m.findEmailById.mockResolvedValue("profil@example.org");
    const result = await fileAccountTicket({
      user,
      ip: "203.0.113.7",
      fields: { ...request, email: "autre@example.org", userId: "user-2" },
    });
    expect(result).toEqual({ ok: true, ticketId: TICKET_ID });
    expect(m.findEmailById).toHaveBeenCalledWith("user-1");
    expect(m.create).toHaveBeenCalledWith({
      ...request,
      email: "profil@example.org",
      userId: "user-1",
    });
    // The contact form's budget, spent by whoever is asking.
    expect(m.checkContactForm).toHaveBeenCalledWith("203.0.113.7");
  });

  it("falls back on the session's address, and refuses without any", async () => {
    m.findEmailById.mockResolvedValue(null);
    await fileAccountTicket({ user, ip: "x", fields: request });
    expect(m.create.mock.calls[0]?.[0].email).toBe("session@example.org");

    m.create.mockClear();
    expect(await fileAccountTicket({ user: { id: "user-1" }, ip: "x", fields: request })).toEqual({
      ok: false,
      error: NO_REPLY_ADDRESS,
    });
    expect(m.create).not.toHaveBeenCalled();
  });

  it("names the missing fields of an input that is not a request", async () => {
    m.findEmailById.mockResolvedValue("profil@example.org");
    const result = await fileAccountTicket({ user, ip: "x", fields: null });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual(["message", "subject", "theme"]);
    expect(m.create).not.toHaveBeenCalled();
  });
});

describe("replyAsRequester", () => {
  const input = { ticketId: TICKET_ID, body: "Toujours bloqué." };

  it("refuses an empty reply or a malformed id without asking anything", async () => {
    expect(await replyAsRequester("user-1", { ...input, body: " " })).toEqual({
      ok: false,
      error: "Écris un message avant d'envoyer.",
    });
    expect((await replyAsRequester("user-1", { ...input, ticketId: "abc" })).ok).toBe(false);
    expect(m.findOwnedId).not.toHaveBeenCalled();
  });

  it("only writes on the reader's own ticket", async () => {
    m.findOwnedId.mockResolvedValue(null);
    expect(await replyAsRequester("user-1", input)).toEqual({
      ok: false,
      error: "Ticket introuvable.",
    });
    expect(m.findOwnedId).toHaveBeenCalledWith(TICKET_ID, "user-1");
    expect(m.addMessage).not.toHaveBeenCalled();
  });

  it("adds the reply as the requester, never as the team", async () => {
    m.findOwnedId.mockResolvedValue(TICKET_ID);
    m.addMessage.mockResolvedValue({ ok: true });
    expect(await replyAsRequester("user-1", input)).toEqual({ ok: true });
    expect(m.addMessage).toHaveBeenCalledWith({
      ticketId: TICKET_ID,
      authorId: "user-1",
      fromStaff: false,
      body: "Toujours bloqué.",
    });
  });

  it("says a finished request is finished, as the repository decides", async () => {
    m.findOwnedId.mockResolvedValue(TICKET_ID);
    m.addMessage.mockResolvedValue({ ok: false, reason: "TERMINAL" });
    expect(await replyAsRequester("user-1", input)).toEqual({
      ok: false,
      error: "Cette demande est terminée. Ouvres-en une nouvelle si le problème revient.",
    });
  });
});
