/**
 * The console's side of a ticket: who has it in hand, the notes the team
 * leaves itself on it, and resolving it once an appeal is accepted. Prisma is mocked: what this checks is what each call
 * refuses, the order of the transaction (the role or the lock before the
 * write, the audit row with it), and that the requester's reads never name
 * either. That the lock really holds a status change back is Postgres's part,
 * and tickets.integration.test.ts runs the same calls on a real database.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ticketRepository } from "../repositories/ticket.repository.js";

const { tx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    user: { findUnique: vi.fn() },
    contactTicket: { findUnique: vi.fn(), updateMany: vi.fn() },
    ticketNote: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      $transaction: vi.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
      contactTicket: { findFirst: vi.fn(), findMany: vi.fn() },
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const TICKET = "33333333-3333-4333-8333-333333333333";
const ADMIN = "44444444-4444-4444-8444-444444444444";
const OTHER_ADMIN = "55555555-5555-4555-8555-555555555555";

/** The strings of a tagged-template call, joined where the values were. */
function sqlOf(mock: ReturnType<typeof vi.fn>): string {
  // The mock is untyped; a tagged template's first argument is its strings.
  const [strings] = mock.mock.calls[0] as [TemplateStringsArray];
  return strings.join("?");
}

beforeEach(() => {
  vi.clearAllMocks();
  tx.$executeRaw.mockResolvedValue(1);
  tx.ticketNote.create.mockResolvedValue({ id: "note-1" });
  tx.auditLog.create.mockResolvedValue({});
});

describe("what the requester's reads select", () => {
  /** Every key a select names, at any depth. */
  function keysOf(value: unknown): string[] {
    if (typeof value !== "object" || value === null) return [];
    return Object.entries(value).flatMap(([key, inner]) => [key, ...keysOf(inner)]);
  }

  it("leaves the assignee and the notes out of the ticket the requester opens", async () => {
    mockPrisma.contactTicket.findFirst.mockResolvedValue(null);
    await ticketRepository.findForRequester(TICKET, ADMIN);
    const keys = keysOf(mockPrisma.contactTicket.findFirst.mock.calls[0]?.[0]);
    expect(keys).toContain("messages");
    expect(keys).not.toContain("notes");
    expect(keys).not.toContain("assignee");
    expect(keys).not.toContain("assigneeId");
  });

  it("leaves them out of the requester's list too", async () => {
    mockPrisma.contactTicket.findMany.mockResolvedValue([]);
    await ticketRepository.findForUser(ADMIN);
    const keys = keysOf(mockPrisma.contactTicket.findMany.mock.calls[0]?.[0]);
    expect(keys).not.toContain("notes");
    expect(keys).not.toContain("assignee");
    expect(keys).not.toContain("assigneeId");
  });
});

describe("assign", () => {
  it("gives the ticket to an administrator and writes the audit row with it", async () => {
    tx.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    tx.contactTicket.findUnique.mockResolvedValue({ assigneeId: OTHER_ADMIN });

    await expect(
      ticketRepository.assign({ ticketId: TICKET, assigneeId: ADMIN, actorId: ADMIN }),
    ).resolves.toEqual({ ok: true, changed: true });

    expect(sqlOf(tx.$executeRaw)).toMatch(/UPDATE "contact_tickets" SET "assigneeId" = \?::uuid/u);
    expect(tx.$executeRaw.mock.calls[0]?.slice(1)).toEqual([ADMIN, TICKET]);
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: ADMIN,
        action: "ticket.assign",
        targetType: "ContactTicket",
        targetId: TICKET,
        metadata: { assigneeId: ADMIN, previousAssigneeId: OTHER_ADMIN },
      },
    });
  });

  it("writes raw, so the ticket's updatedAt is not moved by Prisma", async () => {
    // A Prisma update would stamp updatedAt, which orders the requester's own
    // list: taking a ticket in hand would reorder it over nothing they see.
    tx.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    tx.contactTicket.findUnique.mockResolvedValue({ assigneeId: null });
    await ticketRepository.assign({ ticketId: TICKET, assigneeId: ADMIN, actorId: ADMIN });
    expect(sqlOf(tx.$executeRaw)).not.toMatch(/updatedAt/u);
  });

  it("refuses an account that is not an administrator, and writes nothing", async () => {
    tx.user.findUnique.mockResolvedValue({ role: "TEACHER" });
    await expect(
      ticketRepository.assign({ ticketId: TICKET, assigneeId: OTHER_ADMIN, actorId: ADMIN }),
    ).resolves.toEqual({ ok: false, reason: "NOT_ADMIN" });
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("refuses an account that does not exist the same way", async () => {
    tx.user.findUnique.mockResolvedValue(null);
    await expect(
      ticketRepository.assign({ ticketId: TICKET, assigneeId: OTHER_ADMIN, actorId: ADMIN }),
    ).resolves.toEqual({ ok: false, reason: "NOT_ADMIN" });
  });

  it("takes the ticket back from everybody without asking about a role", async () => {
    tx.contactTicket.findUnique.mockResolvedValue({ assigneeId: ADMIN });
    await expect(
      ticketRepository.assign({ ticketId: TICKET, assigneeId: null, actorId: ADMIN }),
    ).resolves.toEqual({ ok: true, changed: true });
    expect(tx.user.findUnique).not.toHaveBeenCalled();
    expect(tx.$executeRaw.mock.calls[0]?.slice(1)).toEqual([null, TICKET]);
  });

  it("writes nothing, to the ticket or the log, when nothing changes", async () => {
    tx.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    tx.contactTicket.findUnique.mockResolvedValue({ assigneeId: ADMIN });
    await expect(
      ticketRepository.assign({ ticketId: TICKET, assigneeId: ADMIN, actorId: ADMIN }),
    ).resolves.toEqual({ ok: true, changed: false });
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("says when the ticket is gone", async () => {
    tx.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    tx.contactTicket.findUnique.mockResolvedValue(null);
    await expect(
      ticketRepository.assign({ ticketId: TICKET, assigneeId: ADMIN, actorId: ADMIN }),
    ).resolves.toEqual({ ok: false, reason: "NOT_FOUND" });
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
});

describe("addNote", () => {
  const note = { ticketId: TICKET, authorId: ADMIN, body: "Déjà vu ce compte la semaine passée." };

  it("locks the ticket's row before it reads the status", async () => {
    tx.$queryRaw.mockResolvedValue([{ status: "IN_PROGRESS" }]);
    await ticketRepository.addNote(note);
    expect(sqlOf(tx.$queryRaw)).toMatch(/FROM "contact_tickets" WHERE "id" = \?::uuid FOR SHARE/u);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.ticketNote.create.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it.each(["OPEN", "IN_PROGRESS"] as const)(
    "adds the note to a ticket %s, with an audit row that does not quote it",
    async (status) => {
      tx.$queryRaw.mockResolvedValue([{ status }]);
      await expect(ticketRepository.addNote(note)).resolves.toEqual({ ok: true, noteId: "note-1" });
      expect(tx.ticketNote.create).toHaveBeenCalledWith({
        data: note,
        select: { id: true },
      });
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: ADMIN,
          action: "ticket.note.add",
          targetType: "ContactTicket",
          targetId: TICKET,
          metadata: { noteId: "note-1" },
        },
      });
    },
  );

  it.each(["RESOLVED", "CLOSED"] as const)(
    "refuses a ticket %s, which is over for the console too",
    async (status) => {
      tx.$queryRaw.mockResolvedValue([{ status }]);
      await expect(ticketRepository.addNote(note)).resolves.toEqual({
        ok: false,
        reason: "TERMINAL",
      });
      expect(tx.ticketNote.create).not.toHaveBeenCalled();
      expect(tx.auditLog.create).not.toHaveBeenCalled();
    },
  );

  it("tells a missing ticket apart from a finished one", async () => {
    tx.$queryRaw.mockResolvedValue([]);
    await expect(ticketRepository.addNote(note)).resolves.toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
    expect(tx.ticketNote.create).not.toHaveBeenCalled();
  });
});

describe("resolveIfOpen", () => {
  const input = { ticketId: TICKET, actorId: ADMIN };

  it("resolves a ticket still open, with the audit row in the same transaction", async () => {
    tx.contactTicket.updateMany.mockResolvedValue({ count: 1 });

    await expect(ticketRepository.resolveIfOpen(input)).resolves.toBe(true);

    // The status filter is in the statement that writes: a ticket closed in
    // between is not claimed, rather than read as open and then written.
    expect(tx.contactTicket.updateMany).toHaveBeenCalledWith({
      where: { id: TICKET, status: { in: ["OPEN", "IN_PROGRESS"] } },
      data: { status: "RESOLVED" },
    });
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: ADMIN,
        action: "ticket.status.update",
        targetType: "ContactTicket",
        targetId: TICKET,
        metadata: { status: "RESOLVED" },
      },
    });
  });

  it("leaves a finished ticket as it is, and writes no audit row", async () => {
    tx.contactTicket.updateMany.mockResolvedValue({ count: 0 });

    await expect(ticketRepository.resolveIfOpen(input)).resolves.toBe(false);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
