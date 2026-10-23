import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn<() => Promise<{ id: string }>>(),
  ticketFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  record: vi.fn<(entry: Record<string, unknown>) => Promise<void>>(),
  lift: vi.fn<(input: Record<string, unknown>) => Promise<boolean>>(),
  addMessage: vi.fn<(input: Record<string, unknown>) => Promise<unknown>>(),
  resolveIfOpen: vi.fn<(input: Record<string, unknown>) => Promise<boolean>>(),
  assign: vi.fn<(input: Record<string, unknown>) => Promise<unknown>>(),
  addNote: vi.fn<(input: Record<string, unknown>) => Promise<unknown>>(),
  sendTicketReplyEmail: vi.fn<(input: Record<string, unknown>) => Promise<void>>(),
  notify: vi.fn<(input: Record<string, unknown>) => Promise<unknown>>(),
  revalidatePath: vi.fn<(path: string) => void>(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  prisma: {
    contactTicket: { findUnique: m.ticketFindUnique },
  },
  auditLogRepository: { record: m.record },
  banRepository: { lift: m.lift },
  notificationRepository: { create: m.notify },
  ticketRepository: {
    addMessage: m.addMessage,
    resolveIfOpen: m.resolveIfOpen,
    assign: m.assign,
    addNote: m.addNote,
  },
}));
vi.mock("@cyberlearn/email", () => ({ sendTicketReplyEmail: m.sendTicketReplyEmail }));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: m.loggerError },
  errorMessage: (error: unknown) => String(error),
}));
vi.mock("@/lib/env", () => ({ env: { RESEND_API_KEY: "re_test", RESEND_FROM_EMAIL: "a@b.c" } }));
vi.mock("@/lib/learner-url", () => ({
  learnerUrl: (path: string) => `https://site.test${path}`,
  learnerSiteUrl: () => "https://site.test",
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

const { liftAppealedBanAction, replyToTicketAction, assignTicketAction, addTicketNoteAction } =
  await import("../ticket-actions");

/**
 * The console's ticket page: replying to a ticket, accepting an appeal from
 * the ticket, giving a ticket to an administrator, and the notes the team
 * keeps for itself.
 */

const TICKET = "55555555-5555-4555-8555-555555555555";
const BAN = "66666666-6666-4666-8666-666666666666";
const LEARNER = "77777777-7777-4777-8777-777777777777";
const ADMIN = "88888888-8888-4888-8888-888888888888";

function appealTicket(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: TICKET,
    userId: LEARNER,
    subject: "Appel d'une décision de bannissement",
    theme: "BAN_APPEAL",
    email: "eleve@exemple.fr",
    user: {
      email: "eleve@exemple.fr",
      displayName: "Élève",
      preferences: { emailNotifications: true },
    },
    appealFor: { id: BAN, userId: LEARNER },
    ...over,
  };
}

/** A help request of the ordinary kind, the requester's choice about e-mail given. */
function question(emailNotifications: boolean | null): Record<string, unknown> {
  return appealTicket({
    subject: "Comment réinitialiser mon mot de passe ?",
    theme: "QUESTION",
    appealFor: null,
    user: {
      email: "eleve@exemple.fr",
      displayName: "Élève",
      preferences: emailNotifications === null ? null : { emailNotifications },
    },
  });
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

/** The audit actions written, in order. */
function auditActions(): unknown[] {
  return m.record.mock.calls.map(([entry]) => entry.action);
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: ADMIN });
  m.ticketFindUnique.mockResolvedValue(appealTicket());
  m.record.mockResolvedValue(undefined);
  m.lift.mockResolvedValue(true);
  m.addMessage.mockResolvedValue({ ok: true });
  m.resolveIfOpen.mockResolvedValue(true);
  m.sendTicketReplyEmail.mockResolvedValue(undefined);
  m.notify.mockResolvedValue({ id: "notification-1" });
});

describe("replyToTicketAction", () => {
  beforeEach(() => {
    // The status read for the e-mail comes after the reply landed.
    m.ticketFindUnique.mockResolvedValue(appealTicket());
  });

  it("mails the team's reply on a ban appeal to somebody who turned e-mails off", async () => {
    // The author of an appeal is shut out of the ticket's page and of the bell
    // until the ban ends: the mail is the only way the decision reaches them.
    m.ticketFindUnique.mockResolvedValue(
      appealTicket({
        user: {
          email: "eleve@exemple.fr",
          displayName: "Élève",
          preferences: { emailNotifications: false },
        },
      }),
    );
    const result = await replyToTicketAction(
      TICKET,
      "Après relecture, le bannissement est maintenu.",
    );

    expect(result).toEqual({ ok: true });
    expect(m.sendTicketReplyEmail).toHaveBeenCalledOnce();
    expect(m.sendTicketReplyEmail.mock.calls[0]?.[0]).toMatchObject({
      to: "eleve@exemple.fr",
      reply: "Après relecture, le bannissement est maintenu.",
    });
  });

  it("mails a ban appeal's reply to somebody with no preferences saved", async () => {
    m.ticketFindUnique.mockResolvedValue(
      appealTicket({
        user: { email: "eleve@exemple.fr", displayName: "Élève", preferences: null },
      }),
    );
    await replyToTicketAction(TICKET, "Nous examinons ton appel.");
    expect(m.sendTicketReplyEmail).toHaveBeenCalledOnce();
  });

  it("keeps the requester's choice on an ordinary ticket, whose reply is on its page", async () => {
    m.ticketFindUnique.mockResolvedValue(question(false));
    const result = await replyToTicketAction(TICKET, "Utilise le lien « Mot de passe oublié ».");

    expect(result).toEqual({ ok: true });
    expect(m.addMessage).toHaveBeenCalledOnce();
    expect(m.sendTicketReplyEmail).not.toHaveBeenCalled();
  });

  it("mails an ordinary ticket's reply to somebody who takes e-mails", async () => {
    m.ticketFindUnique.mockResolvedValue(question(true));
    await replyToTicketAction(TICKET, "Utilise le lien « Mot de passe oublié ».");
    expect(m.sendTicketReplyEmail).toHaveBeenCalledOnce();
  });

  it("puts the answer in the bell of somebody who turned e-mails off", async () => {
    m.ticketFindUnique.mockResolvedValue(question(false));
    await replyToTicketAction(TICKET, "Utilise le lien « Mot de passe oublié ».");

    expect(m.notify).toHaveBeenCalledWith({
      userId: LEARNER,
      type: "TICKET_UPDATE",
      title: "L'équipe a répondu à ta demande",
      body: "Comment réinitialiser mon mot de passe ?",
      actionUrl: `/support/${TICKET}`,
    });
  });

  it("notifies nobody on a guest's ticket, which has no account, and still mails it", async () => {
    m.ticketFindUnique.mockResolvedValue(
      appealTicket({
        userId: null,
        theme: "QUESTION",
        appealFor: null,
        user: null,
        email: "invite@exemple.fr",
      }),
    );
    await replyToTicketAction(TICKET, "Bonjour, voici la réponse.");

    expect(m.notify).not.toHaveBeenCalled();
    expect(m.sendTicketReplyEmail).toHaveBeenCalledOnce();
    expect(m.sendTicketReplyEmail.mock.calls[0]?.[0]).toMatchObject({ to: "invite@exemple.fr" });
  });

  it("keeps the reply as sent when the bell cannot be written", async () => {
    m.notify.mockRejectedValue(new Error("connection reset"));
    const result = await replyToTicketAction(TICKET, "Nous examinons ton appel.");

    expect(result).toEqual({ ok: true });
    expect(m.loggerError).toHaveBeenCalled();
    // The mail does not wait on the bell.
    expect(m.sendTicketReplyEmail).toHaveBeenCalledOnce();
  });

  it("neither mails nor notifies a reply the repository refused", async () => {
    m.addMessage.mockResolvedValue({ ok: false, reason: "TERMINAL" });
    const result = await replyToTicketAction(TICKET, "Un mot de plus.");

    expect(result).toEqual({
      ok: false,
      error: "Ticket résolu ou clos : rouvre-le pour répondre.",
    });
    expect(m.notify).not.toHaveBeenCalled();
    expect(m.sendTicketReplyEmail).not.toHaveBeenCalled();
  });
});

describe("liftAppealedBanAction", () => {
  it("lifts the ban the appeal contests, by its id, and resolves the ticket", async () => {
    const result = await liftAppealedBanAction({}, form({ ticketId: TICKET, reason: "" }));

    expect(result).toEqual({ ok: true, resolved: true });
    // The journal's line rides in the lift's own transaction, the repository's.
    expect(m.lift).toHaveBeenCalledWith({
      userId: LEARNER,
      banId: BAN,
      liftedById: ADMIN,
      auditMetadata: { reason: null, ticketId: TICKET, banId: BAN },
    });
    expect(m.resolveIfOpen).toHaveBeenCalledWith({ ticketId: TICKET, actorId: ADMIN });
    expect(m.record).not.toHaveBeenCalled();
    expect(m.revalidatePath).toHaveBeenCalledWith(`/tickets/${TICKET}`);
    expect(m.revalidatePath).toHaveBeenCalledWith(`/users/${LEARNER}`);
  });

  it("passes the lift's reason on, and writes it to the journal", async () => {
    await liftAppealedBanAction({}, form({ ticketId: TICKET, reason: "  Appel accepté  " }));
    expect(m.lift).toHaveBeenCalledWith({
      userId: LEARNER,
      banId: BAN,
      liftedById: ADMIN,
      reason: "Appel accepté",
      auditMetadata: { reason: "Appel accepté", ticketId: TICKET, banId: BAN },
    });
  });

  it("refuses when the ban is no longer in force, and touches nothing else", async () => {
    // Lifted from the account's page, or run out, since the page was drawn.
    m.lift.mockResolvedValue(false);
    const result = await liftAppealedBanAction(
      {},
      form({ ticketId: TICKET, reply: "Ton bannissement est levé." }),
    );

    expect(result.ok).toBeUndefined();
    expect(result.error).toMatch(/n'est plus en cours/u);
    expect(m.record).not.toHaveBeenCalled();
    expect(m.addMessage).not.toHaveBeenCalled();
    expect(m.resolveIfOpen).not.toHaveBeenCalled();
    expect(m.sendTicketReplyEmail).not.toHaveBeenCalled();
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("says nothing changed when the lift itself fails, rather than throwing", async () => {
    // The lift and its journal line are one transaction: a failure undid both.
    m.lift.mockRejectedValue(new Error("connection reset"));
    const result = await liftAppealedBanAction(
      {},
      form({ ticketId: TICKET, reply: "Ton bannissement est levé." }),
    );

    expect(result).toEqual({
      error: "Le bannissement n'a pas pu être levé. Rien n'a été modifié.",
    });
    expect(m.loggerError).toHaveBeenCalled();
    expect(m.addMessage).not.toHaveBeenCalled();
    expect(m.resolveIfOpen).not.toHaveBeenCalled();
  });

  it("refuses a ticket that contests no ban", async () => {
    m.ticketFindUnique.mockResolvedValue(appealTicket({ appealFor: null }));
    const result = await liftAppealedBanAction({}, form({ ticketId: TICKET }));
    expect(result.error).toMatch(/aucun bannissement/u);
    expect(m.lift).not.toHaveBeenCalled();
  });

  it("refuses a ticket that does not exist", async () => {
    m.ticketFindUnique.mockResolvedValue(null);
    const result = await liftAppealedBanAction({}, form({ ticketId: TICKET }));
    expect(result.error).toBe("Ticket introuvable.");
    expect(m.lift).not.toHaveBeenCalled();
  });

  it("refuses an identifier that is not one before reading anything", async () => {
    const result = await liftAppealedBanAction({}, form({ ticketId: "../../users" }));
    expect(result.error).toBeDefined();
    expect(m.ticketFindUnique).not.toHaveBeenCalled();
  });

  it("refuses a reason over 500 characters", async () => {
    const result = await liftAppealedBanAction(
      {},
      form({ ticketId: TICKET, reason: "x".repeat(501) }),
    );
    expect(result.error).toMatch(/500 caractères/u);
    expect(m.lift).not.toHaveBeenCalled();
  });

  it("posts the reply before resolving, through the repository's gate, and e-mails it", async () => {
    // The status read for the e-mail comes after the resolution.
    m.ticketFindUnique
      .mockResolvedValueOnce(appealTicket())
      .mockResolvedValueOnce({ status: "RESOLVED" });
    const result = await liftAppealedBanAction(
      {},
      form({ ticketId: TICKET, reply: "Après relecture, ton bannissement est levé." }),
    );

    expect(result).toEqual({ ok: true, resolved: true });
    expect(m.addMessage).toHaveBeenCalledWith({
      ticketId: TICKET,
      authorId: ADMIN,
      fromStaff: true,
      body: "Après relecture, ton bannissement est levé.",
    });
    // A resolved ticket takes no message: the reply has to land first.
    expect(m.addMessage.mock.invocationCallOrder[0]).toBeLessThan(
      m.resolveIfOpen.mock.invocationCallOrder[0] ?? 0,
    );
    expect(auditActions()).toEqual(["ticket.reply"]);
    expect(m.sendTicketReplyEmail).toHaveBeenCalledOnce();
    expect(m.sendTicketReplyEmail.mock.calls[0]?.[0]).toMatchObject({
      to: "eleve@exemple.fr",
      reply: "Après relecture, ton bannissement est levé.",
      statusLabel: "Résolu",
    });
  });

  it("keeps the ban lifted and says so when the ticket was closed in between", async () => {
    m.addMessage.mockResolvedValue({ ok: false, reason: "TERMINAL" });
    m.resolveIfOpen.mockResolvedValue(false);
    const result = await liftAppealedBanAction(
      {},
      form({ ticketId: TICKET, reply: "Ton bannissement est levé." }),
    );

    expect(result.ok).toBe(true);
    expect(result.warning).toMatch(/levé, mais la réponse n'est pas partie/u);
    expect(m.record).not.toHaveBeenCalled();
    expect(m.sendTicketReplyEmail).not.toHaveBeenCalled();
  });

  it("warns rather than throws when the reply cannot be written, and leaves the ticket open", async () => {
    // After the lift has committed: an error page here would hide that the ban
    // is lifted, and a retry would be told it no longer is.
    m.addMessage.mockRejectedValue(new Error("connection reset"));
    const result = await liftAppealedBanAction(
      {},
      form({ ticketId: TICKET, reply: "Ton bannissement est levé." }),
    );

    expect(result).toEqual({
      ok: true,
      resolved: false,
      warning:
        "Le bannissement est levé, mais la réponse n'a pas pu être enregistrée : le ticket reste ouvert pour la renvoyer.",
    });
    // Resolving would close the conversation the answer still has to go into.
    expect(m.resolveIfOpen).not.toHaveBeenCalled();
    expect(m.record).not.toHaveBeenCalled();
    expect(m.sendTicketReplyEmail).not.toHaveBeenCalled();
    expect(m.loggerError).toHaveBeenCalled();
    expect(m.revalidatePath).toHaveBeenCalledWith(`/users/${LEARNER}`);
  });

  it("keeps a written reply as sent when only its journal line fails", async () => {
    m.record.mockRejectedValue(new Error("connection reset"));
    const result = await liftAppealedBanAction(
      {},
      form({ ticketId: TICKET, reply: "Ton bannissement est levé." }),
    );

    expect(result).toEqual({ ok: true, resolved: true });
    expect(m.resolveIfOpen).toHaveBeenCalledOnce();
    expect(m.sendTicketReplyEmail).toHaveBeenCalledOnce();
    expect(m.loggerError).toHaveBeenCalled();
  });

  it("still answers when the status read for the e-mail fails", async () => {
    m.ticketFindUnique
      .mockResolvedValueOnce(appealTicket())
      .mockRejectedValueOnce(new Error("connection reset"));
    const result = await liftAppealedBanAction(
      {},
      form({ ticketId: TICKET, reply: "Ton bannissement est levé." }),
    );

    expect(result).toEqual({ ok: true, resolved: true });
    expect(m.sendTicketReplyEmail).not.toHaveBeenCalled();
    expect(m.loggerError).toHaveBeenCalled();
  });

  it("lifts from a ticket already finished, and leaves the ticket as it is", async () => {
    // The appeal was closed without a decision, and the team changed its mind.
    m.resolveIfOpen.mockResolvedValue(false);
    const result = await liftAppealedBanAction({}, form({ ticketId: TICKET }));

    expect(result).toEqual({ ok: true, resolved: false });
    expect(m.lift).toHaveBeenCalledOnce();
  });

  it("mails the reply even to someone who turned e-mails off: it is the decision on their account", async () => {
    m.ticketFindUnique.mockResolvedValue(
      appealTicket({
        user: {
          email: "eleve@exemple.fr",
          displayName: "Élève",
          preferences: { emailNotifications: false },
        },
      }),
    );
    await liftAppealedBanAction({}, form({ ticketId: TICKET, reply: "C'est levé." }));
    expect(m.addMessage).toHaveBeenCalledOnce();
    expect(m.sendTicketReplyEmail).toHaveBeenCalledOnce();
    expect(m.sendTicketReplyEmail.mock.calls[0]?.[0]).toMatchObject({
      to: "eleve@exemple.fr",
      reply: "C'est levé.",
    });
  });

  it("tells the account in its bell too, for when the ban is over", async () => {
    await liftAppealedBanAction({}, form({ ticketId: TICKET, reply: "C'est levé." }));
    expect(m.notify).toHaveBeenCalledWith({
      userId: LEARNER,
      type: "TICKET_UPDATE",
      title: "L'équipe a répondu à ton appel",
      body: "Appel d'une décision de bannissement",
      actionUrl: `/support/${TICKET}`,
    });
  });

  it("notifies nothing when no reply was written", async () => {
    await liftAppealedBanAction({}, form({ ticketId: TICKET }));
    expect(m.notify).not.toHaveBeenCalled();
    expect(m.sendTicketReplyEmail).not.toHaveBeenCalled();
  });

  it("warns rather than throws when the ticket cannot be resolved", async () => {
    m.resolveIfOpen.mockRejectedValue(new Error("connection reset"));
    const result = await liftAppealedBanAction({}, form({ ticketId: TICKET }));
    expect(result.ok).toBe(true);
    expect(result.warning).toMatch(/n'a pas pu passer en résolu/u);
    expect(m.loggerError).toHaveBeenCalled();
  });
});

describe("assignTicketAction", () => {
  it("gives the ticket through the repository, as the acting administrator", async () => {
    m.assign.mockResolvedValue({ ok: true, changed: true });
    await expect(assignTicketAction(TICKET, ADMIN)).resolves.toEqual({ ok: true });
    expect(m.assign).toHaveBeenCalledWith({ ticketId: TICKET, assigneeId: ADMIN, actorId: ADMIN });
    expect(m.revalidatePath).toHaveBeenCalledWith(`/tickets/${TICKET}`);
    expect(m.revalidatePath).toHaveBeenCalledWith("/tickets");
  });

  it("takes it back from everybody with null", async () => {
    m.assign.mockResolvedValue({ ok: true, changed: true });
    await assignTicketAction(TICKET, null);
    expect(m.assign).toHaveBeenCalledWith({ ticketId: TICKET, assigneeId: null, actorId: ADMIN });
  });

  it("says why when the account is not an administrator", async () => {
    m.assign.mockResolvedValue({ ok: false, reason: "NOT_ADMIN" });
    const result = await assignTicketAction(TICKET, LEARNER);
    expect(result).toEqual({
      ok: false,
      error: "Un ticket ne s'assigne qu'à un administrateur.",
    });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses an identifier that is not one without asking the repository", async () => {
    const result = await assignTicketAction(TICKET, "tout-le-monde");
    expect(result.ok).toBe(false);
    expect(m.assign).not.toHaveBeenCalled();
  });

  it("revalidates nothing when nothing changed", async () => {
    m.assign.mockResolvedValue({ ok: true, changed: false });
    await expect(assignTicketAction(TICKET, ADMIN)).resolves.toEqual({ ok: true });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("says so when the database refuses, rather than throwing to the error page", async () => {
    m.assign.mockRejectedValue(new Error("connection reset"));
    const result = await assignTicketAction(TICKET, ADMIN);
    expect(result.error).toMatch(/n'a pas pu être changée/u);
    expect(m.loggerError).toHaveBeenCalled();
  });
});

describe("addTicketNoteAction", () => {
  it("writes the note as the acting administrator, trimmed", async () => {
    m.addNote.mockResolvedValue({ ok: true, noteId: "note-1" });
    await expect(addTicketNoteAction(TICKET, "  À rappeler lundi.  ")).resolves.toEqual({
      ok: true,
    });
    expect(m.addNote).toHaveBeenCalledWith({
      ticketId: TICKET,
      authorId: ADMIN,
      body: "À rappeler lundi.",
    });
    expect(m.revalidatePath).toHaveBeenCalledWith(`/tickets/${TICKET}`);
  });

  it("refuses an empty note before the repository sees it", async () => {
    const result = await addTicketNoteAction(TICKET, "   ");
    expect(result).toEqual({ ok: false, error: "Note vide ou trop longue." });
    expect(m.addNote).not.toHaveBeenCalled();
  });

  it("says a finished ticket takes no note, as the repository decides", async () => {
    m.addNote.mockResolvedValue({ ok: false, reason: "TERMINAL" });
    const result = await addTicketNoteAction(TICKET, "Une note de plus.");
    expect(result.error).toMatch(/résolu ou clos/u);
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});
