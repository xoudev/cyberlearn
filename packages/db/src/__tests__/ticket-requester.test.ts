/**
 * The requester's two writes the contact form and the app's support screen
 * used to make through Prisma directly: filing a ticket, and finding out that
 * a ticket is the account's own before adding to its conversation. Prisma is
 * mocked: what this checks is what is written and what the lookup is scoped by.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ticketRepository } from "../repositories/ticket.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    contactTicket: {
      create: vi.fn<(args: { data: Record<string, unknown> }) => Promise<{ id: string }>>(),
      findFirst: vi.fn<(args: unknown) => Promise<{ id: string } | null>>(),
    },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const TICKET = "33333333-3333-4333-8333-333333333333";
const REQUESTER = "44444444-4444-4444-8444-444444444444";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ticketRepository.create", () => {
  const request = {
    subject: "Vidéo muette",
    theme: "BUG",
    message: "La vidéo de la leçon 3 n'a pas de son sur mon téléphone.",
    email: "alex@example.org",
  } as const;

  it("files the request open, for the account, and hands back its id", async () => {
    mockPrisma.contactTicket.create.mockResolvedValue({ id: TICKET });
    expect(await ticketRepository.create({ ...request, userId: REQUESTER })).toEqual({
      id: TICKET,
    });
    expect(mockPrisma.contactTicket.create).toHaveBeenCalledWith({
      data: { ...request, userId: REQUESTER, status: "OPEN" },
      select: { id: true },
    });
  });

  /** The columns the last call wrote. */
  function written(): Record<string, unknown> {
    const call = mockPrisma.contactTicket.create.mock.calls[0];
    if (call === undefined) throw new Error("Nothing was written");
    return call[0].data;
  }

  it("files a guest's request with no account", async () => {
    mockPrisma.contactTicket.create.mockResolvedValue({ id: TICKET });
    await ticketRepository.create({ ...request, userId: null });
    expect(written()["userId"]).toBeNull();
  });

  it("writes nothing the caller did not name, whatever it is handed", async () => {
    mockPrisma.contactTicket.create.mockResolvedValue({ id: TICKET });
    // Status, assignee and the console's own columns are not the requester's.
    const smuggled = { ...request, userId: REQUESTER, status: "RESOLVED", assigneeId: "x" };
    await ticketRepository.create(smuggled);
    expect(Object.keys(written()).sort()).toEqual([
      "email",
      "message",
      "status",
      "subject",
      "theme",
      "userId",
    ]);
    expect(written()["status"]).toBe("OPEN");
  });
});

describe("ticketRepository.findOwnedId", () => {
  it("looks the ticket up by its id and its owner together", async () => {
    mockPrisma.contactTicket.findFirst.mockResolvedValue({ id: TICKET });
    expect(await ticketRepository.findOwnedId(TICKET, REQUESTER)).toBe(TICKET);
    expect(mockPrisma.contactTicket.findFirst).toHaveBeenCalledWith({
      where: { id: TICKET, userId: REQUESTER },
      select: { id: true },
    });
  });

  it("is null for a ticket somebody else opened, or that is not there", async () => {
    mockPrisma.contactTicket.findFirst.mockResolvedValue(null);
    expect(await ticketRepository.findOwnedId(TICKET, REQUESTER)).toBeNull();
  });
});
