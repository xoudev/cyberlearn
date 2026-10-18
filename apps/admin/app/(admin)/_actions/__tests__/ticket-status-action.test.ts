import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => {
  const tx = { contactTicket: { update: vi.fn<(args: unknown) => Promise<unknown>>() } };
  return {
    tx,
    requireAdminAction: vi.fn<() => Promise<{ id: string }>>(),
    record: vi.fn<(entry: Record<string, unknown>, db?: unknown) => Promise<void>>(),
    transaction: vi.fn<(work: (client: typeof tx) => Promise<unknown>) => Promise<unknown>>(),
    revalidatePath: vi.fn<(path: string) => void>(),
    loggerError: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  prisma: { $transaction: m.transaction },
  auditLogRepository: { record: m.record },
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
  m.tx.contactTicket.update.mockResolvedValue({});
  m.record.mockResolvedValue(undefined);
  m.transaction.mockImplementation((work) => work(m.tx));
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
    expect(m.tx.contactTicket.update).toHaveBeenCalledWith({
      where: { id: TICKET },
      data: { status: "IN_PROGRESS" },
    });
    // In the transaction that changes the status, by its client.
    expect(m.record).toHaveBeenCalledExactlyOnceWith(
      {
        actorId: "admin-1",
        action: "ticket.status.update",
        targetType: "ContactTicket",
        targetId: TICKET,
        metadata: { status: "IN_PROGRESS" },
      },
      m.tx,
    );
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
