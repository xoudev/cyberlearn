import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  findActive: vi.fn<(userId: string) => Promise<Record<string, unknown> | null>>(),
  acknowledge: vi.fn<(banId: string, userId: string) => Promise<void>>(),
  attachAppeal: vi.fn<(banId: string, userId: string, ticketId: string) => Promise<boolean>>(),
  findUnique: vi.fn<(args: unknown) => Promise<{ email: string | null } | null>>(),
  create: vi.fn<(args: { data: Record<string, unknown> }) => Promise<{ id: string }>>(),
  deleteMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  checkContactForm:
    vi.fn<(ip: string) => Promise<{ success: boolean; retryAfterSeconds: number }>>(),
  findAppealFor:
    vi.fn<
      (
        ticketId: string,
        viewerId: string,
      ) => Promise<{
        status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
        reply: { body: string; createdAt: Date } | null;
      } | null>
    >(),
}));

vi.mock("@cyberlearn/db", () => ({
  banRepository: {
    findActive: m.findActive,
    acknowledge: m.acknowledge,
    attachAppeal: m.attachAppeal,
  },
  ticketRepository: { findAppealFor: m.findAppealFor },
  prisma: {
    user: { findUnique: m.findUnique },
    contactTicket: { create: m.create, deleteMany: m.deleteMany },
  },
}));
vi.mock("@/lib/rate-limit", () => ({ checkContactForm: m.checkContactForm }));

const { acknowledgeBan, appealBan, appealStanding, currentAppeal } = await import("../ban-appeal");

const BAN = { id: "ban-1", reason: "Insultes répétées sur le forum.", appealTicketId: null };
const MESSAGE = "Je pense qu'il y a eu une erreur : je citais le message de quelqu'un d'autre.";

function appeal(overrides: Partial<Parameters<typeof appealBan>[0]> = {}) {
  return appealBan({
    userId: "user-1",
    fallbackEmail: "session@example.org",
    message: MESSAGE,
    ip: "203.0.113.7",
    ...overrides,
  });
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.checkContactForm.mockResolvedValue({ success: true, retryAfterSeconds: 0 });
  m.findUnique.mockResolvedValue({ email: "profil@example.org" });
  m.create.mockResolvedValue({ id: "ticket-1" });
  m.attachAppeal.mockResolvedValue(true);
});

describe("acknowledgeBan", () => {
  it("does nothing for an account with no ban in force", async () => {
    m.findActive.mockResolvedValue(null);
    expect(await acknowledgeBan("user-1")).toEqual({ ok: false });
    expect(m.acknowledge).not.toHaveBeenCalled();
  });

  it("records the notice as seen, on the ban in force", async () => {
    m.findActive.mockResolvedValue(BAN);
    expect(await acknowledgeBan("user-1")).toEqual({ ok: true });
    expect(m.acknowledge).toHaveBeenCalledWith("ban-1", "user-1");
  });
});

describe("appealStanding", () => {
  it("reads nothing for a ban nobody appealed", async () => {
    expect(await appealStanding({ userId: "user-1", appealTicketId: null })).toBeNull();
    expect(m.findAppealFor).not.toHaveBeenCalled();
  });

  it("reads the ticket as the account asking, and gives its stage and the team's answer", async () => {
    m.findAppealFor.mockResolvedValue({
      status: "RESOLVED",
      reply: {
        body: "Après relecture, le bannissement est maintenu.",
        createdAt: new Date("2026-10-20T09:30:00.000Z"),
      },
    });

    const view = await appealStanding({ userId: "user-1", appealTicketId: "ticket-1" });

    expect(m.findAppealFor).toHaveBeenCalledWith("ticket-1", "user-1");
    expect(view).toMatchObject({
      stage: "DECIDED",
      title: "Appel examiné",
      reply: {
        body: "Après relecture, le bannissement est maintenu.",
        createdAt: "2026-10-20T09:30:00.000Z",
      },
    });
  });

  it("says an appeal not yet answered is received", async () => {
    m.findAppealFor.mockResolvedValue({ status: "OPEN", reply: null });
    const view = await appealStanding({ userId: "user-1", appealTicketId: "ticket-1" });
    expect(view).toMatchObject({ stage: "RECEIVED", reply: null });
  });

  it("reads nothing for a ticket that is gone or not theirs", async () => {
    m.findAppealFor.mockResolvedValue(null);
    expect(await appealStanding({ userId: "user-1", appealTicketId: "ticket-1" })).toBeNull();
  });
});

describe("currentAppeal", () => {
  it("has nothing for an account with no ban in force", async () => {
    m.findActive.mockResolvedValue(null);
    expect(await currentAppeal("user-1")).toBeNull();
    expect(m.findAppealFor).not.toHaveBeenCalled();
  });

  it("reads the appeal filed against the ban in force", async () => {
    m.findActive.mockResolvedValue({ ...BAN, appealTicketId: "ticket-9" });
    m.findAppealFor.mockResolvedValue({ status: "IN_PROGRESS", reply: null });

    const view = await currentAppeal("user-1");

    expect(m.findAppealFor).toHaveBeenCalledWith("ticket-9", "user-1");
    expect(view?.stage).toBe("IN_REVIEW");
  });
});

describe("appealBan", () => {
  it("refuses when there is no ban to appeal", async () => {
    m.findActive.mockResolvedValue(null);
    expect(await appeal()).toEqual({ error: "Aucun bannissement en cours sur ce compte." });
    expect(m.create).not.toHaveBeenCalled();
  });

  it("refuses a second appeal on the same decision", async () => {
    m.findActive.mockResolvedValue({ ...BAN, appealTicketId: "ticket-0" });
    expect(await appeal()).toEqual({ error: "Un appel est déjà ouvert pour cette décision." });
    expect(m.create).not.toHaveBeenCalled();
  });

  it.each([[undefined], [42], ["Trop court."], ["x".repeat(4001)]])(
    "refuses a message that is missing, not text, too short or too long (%#)",
    async (message) => {
      m.findActive.mockResolvedValue(BAN);
      const result = await appeal({ message });
      expect(result.ok).toBeUndefined();
      expect(result.error).toBeTruthy();
      expect(m.create).not.toHaveBeenCalled();
    },
  );

  it("refuses over the contact form's budget, counted on the caller's address", async () => {
    m.findActive.mockResolvedValue(BAN);
    // The delay is told in minutes, like the ticket form's: "dans 599
    // secondes" is a number to divide.
    m.checkContactForm.mockResolvedValue({ success: false, retryAfterSeconds: 599 });
    expect(await appeal()).toEqual({ error: "Trop de demandes. Réessaie dans 10 minutes." });
    expect(m.checkContactForm).toHaveBeenCalledWith("203.0.113.7");
    expect(m.create).not.toHaveBeenCalled();
  });

  it("files a BAN_APPEAL ticket carrying the reason, and attaches it to the ban", async () => {
    m.findActive.mockResolvedValue(BAN);
    expect(await appeal()).toEqual({ ok: true });
    const data = m.create.mock.calls[0]?.[0].data;
    expect(data).toMatchObject({
      userId: "user-1",
      email: "profil@example.org",
      theme: "BAN_APPEAL",
      status: "OPEN",
    });
    expect(data?.message).toBe(`Motif du bannissement : ${BAN.reason}\n\n---\n\n${MESSAGE}`);
    expect(m.attachAppeal).toHaveBeenCalledWith("ban-1", "user-1", "ticket-1");
  });

  it("falls back on the session's address when the profile has none", async () => {
    m.findActive.mockResolvedValue(BAN);
    m.findUnique.mockResolvedValue({ email: null });
    await appeal();
    expect(m.create.mock.calls[0]?.[0].data.email).toBe("session@example.org");
  });

  it("drops its own ticket when a simultaneous appeal won the race", async () => {
    m.findActive.mockResolvedValue(BAN);
    m.attachAppeal.mockResolvedValue(false);
    expect(await appeal()).toEqual({ error: "Un appel est déjà ouvert pour cette décision." });
    expect(m.deleteMany).toHaveBeenCalledWith({ where: { id: "ticket-1" } });
  });
});
