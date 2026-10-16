import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn<() => Promise<{ id: string }>>(),
  ticketUpdate: vi.fn<(args: unknown) => Promise<unknown>>(),
  auditCreate: vi.fn<(args: { data: Record<string, unknown> }) => Promise<unknown>>(),
  transaction: vi.fn<(operations: Promise<unknown>[]) => Promise<unknown[]>>(),
  revalidatePath: vi.fn<(path: string) => void>(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  prisma: {
    contactTicket: { update: m.ticketUpdate },
    auditLog: { create: m.auditCreate },
    $transaction: m.transaction,
  },
  ticketRepository: {},
}));
vi.mock("@cyberlearn/email", () => ({ sendTicketReplyEmail: vi.fn() }));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: m.loggerError },
  errorMessage: (error: unknown) => String(error),
}));
vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("@/lib/learner-url", () => ({ learnerUrl: vi.fn(), learnerSiteUrl: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

const { updateTicketStatusAction } = await import("../ticket-actions");
const { isTicketStatus, TICKET_STATUSES } = await import("../../tickets/ticket-meta");

/**
 * Changing a ticket's status from the console: the value is checked rather
 * than cast on its way in, and a failure comes back as a sentence under the
 * control instead of an error page.
 */

const TICKET = "55555555-5555-4555-8555-555555555555";

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: "admin-1" });
  m.ticketUpdate.mockResolvedValue({});
  m.auditCreate.mockResolvedValue({});
  m.transaction.mockImplementation((operations) => Promise.all(operations));
});

describe("isTicketStatus", () => {
  it.each(TICKET_STATUSES)("accepts %s", (status) => {
    expect(isTicketStatus(status)).toBe(true);
  });

  it("refuses anything else a control could hand back", () => {
    expect(isTicketStatus("")).toBe(false);
    expect(isTicketStatus("open")).toBe(false);
    expect(isTicketStatus("ARCHIVED")).toBe(false);
  });
});

describe("updateTicketStatusAction", () => {
  it("writes the status and its audit row together", async () => {
    await expect(updateTicketStatusAction(TICKET, "IN_PROGRESS")).resolves.toEqual({ ok: true });
    expect(m.transaction).toHaveBeenCalledOnce();
    expect(m.ticketUpdate).toHaveBeenCalledWith({
      where: { id: TICKET },
      data: { status: "IN_PROGRESS" },
    });
    expect(m.auditCreate.mock.calls[0]?.[0].data).toMatchObject({
      action: "ticket.status.update",
      targetId: TICKET,
      metadata: { status: "IN_PROGRESS" },
    });
    expect(m.revalidatePath).toHaveBeenCalledWith(`/tickets/${TICKET}`);
  });

  it("says so when the database refuses, rather than throwing to the error page", async () => {
    m.transaction.mockRejectedValue(new Error("connection reset"));
    const result = await updateTicketStatusAction(TICKET, "RESOLVED");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/n'a pas pu être changé/u);
    expect(m.loggerError).toHaveBeenCalled();
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});
