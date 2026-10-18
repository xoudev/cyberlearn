import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => {
  const update = vi.fn<(args: unknown) => Promise<unknown>>();
  /** The client a transaction hands its callback. */
  const tx = { path: { update } };
  return {
    tx,
    requireAdminAction: vi.fn<() => Promise<{ id: string }>>(),
    findUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
    update,
    record: vi.fn<(entry: Record<string, unknown>, db?: unknown) => Promise<void>>(),
    transaction: vi.fn<(work: (client: typeof tx) => Promise<unknown>) => Promise<unknown>>(),
    revalidatePath: vi.fn<(path: string) => void>(),
  };
});

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  prisma: {
    path: { findUnique: m.findUnique },
    $transaction: m.transaction,
  },
  auditLogRepository: { record: m.record },
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { updatePathStatusAction } = await import("../path-actions");

/**
 * A path published, sent back to draft or archived from the list. The status
 * and its audit row are one transaction: a status nobody can trace, or an
 * audit row for a change that was rolled back, is what it rules out.
 */

const ID = "55555555-5555-4555-8555-555555555555";
const NOW = new Date("2026-10-18T09:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: "admin-1" });
  m.update.mockResolvedValue({});
  m.record.mockResolvedValue(undefined);
  m.transaction.mockImplementation((work) => work(m.tx));
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("updatePathStatusAction", () => {
  it("publishes, stamps the date, and logs the change in the same transaction", async () => {
    m.findUnique.mockResolvedValue({ id: ID, status: "DRAFT" });

    await expect(updatePathStatusAction(ID, "PUBLISHED")).resolves.toEqual({});

    expect(m.transaction).toHaveBeenCalledOnce();
    expect(m.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: ID },
      data: { status: "PUBLISHED", publishedAt: NOW },
    });
    expect(m.record).toHaveBeenCalledOnce();
    expect(m.record.mock.calls[0]?.[0]).toEqual({
      actorId: "admin-1",
      action: "path.status",
      targetType: "Path",
      targetId: ID,
      metadata: { from: "DRAFT", to: "PUBLISHED" },
    });
    // By the transaction's client, so a rolled-back status leaves no audit row.
    expect(m.record.mock.calls[0]?.[1]).toBe(m.tx);
  });

  it("archives without touching the publication date", async () => {
    m.findUnique.mockResolvedValue({ id: ID, status: "PUBLISHED" });

    await updatePathStatusAction(ID, "ARCHIVED");

    expect(m.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: ID },
      data: { status: "ARCHIVED" },
    });
    expect(m.record.mock.calls[0]?.[0]).toMatchObject({
      metadata: { from: "PUBLISHED", to: "ARCHIVED" },
    });
    expect(m.record.mock.calls[0]?.[1]).toBe(m.tx);
    expect(m.revalidatePath).toHaveBeenCalledWith("/paths");
    expect(m.revalidatePath).toHaveBeenCalledWith("/paths/archives");
  });

  it("writes nothing for a path that does not exist", async () => {
    m.findUnique.mockResolvedValue(null);

    await expect(updatePathStatusAction(ID, "PUBLISHED")).resolves.toEqual({
      error: "Parcours introuvable.",
    });
    expect(m.transaction).not.toHaveBeenCalled();
    expect(m.record).not.toHaveBeenCalled();
  });
});
