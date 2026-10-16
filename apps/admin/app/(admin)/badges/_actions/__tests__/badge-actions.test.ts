import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn<() => Promise<{ id: string }>>(),
  findUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  update: vi.fn<(args: unknown) => Promise<unknown>>(),
  remove: vi.fn<(args: unknown) => Promise<unknown>>(),
  auditCreate: vi.fn<(args: { data: Record<string, unknown> }) => Promise<unknown>>(),
  transaction: vi.fn<(operations: Promise<unknown>[]) => Promise<unknown[]>>(),
  revalidatePath: vi.fn<(path: string) => void>(),
  redirect: vi.fn<(url: string) => never>(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  prisma: {
    badge: { findUnique: m.findUnique, update: m.update, delete: m.remove },
    auditLog: { create: m.auditCreate },
    $transaction: m.transaction,
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));

const { deleteBadgeAction, toggleBadgeActiveAction } = await import("../badge-actions");

/**
 * A badge deleted from its own edit page, and one switched on or off.
 *
 * The deletion revalidated the list and returned, which re-rendered the edit
 * page of a badge that no longer existed: notFound(), and Next's own 404. The
 * switch wrote nothing to the audit log.
 */

const ID = "44444444-4444-4444-8444-444444444444";

function form(id: string): FormData {
  const data = new FormData();
  data.append("id", id);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: "admin-1" });
  m.update.mockResolvedValue({});
  m.remove.mockResolvedValue({});
  m.auditCreate.mockResolvedValue({});
  m.transaction.mockImplementation((operations) => Promise.all(operations));
  m.redirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
});

describe("deleteBadgeAction", () => {
  it("deletes, logs, and goes back to the list", async () => {
    m.findUnique.mockResolvedValue({ name: "Pionnier", _count: { userBadges: 0 } });
    await expect(deleteBadgeAction(form(ID))).rejects.toThrow("NEXT_REDIRECT:/badges");
    expect(m.remove).toHaveBeenCalledWith({ where: { id: ID } });
    expect(m.auditCreate.mock.calls[0]?.[0].data).toMatchObject({
      action: "badge.delete",
      targetId: ID,
    });
  });

  it("goes back to the list when the badge is already gone", async () => {
    m.findUnique.mockResolvedValue(null);
    await expect(deleteBadgeAction(form(ID))).rejects.toThrow("NEXT_REDIRECT:/badges");
    expect(m.remove).not.toHaveBeenCalled();
  });

  it("stays and re-reads the page when somebody has earned it since", async () => {
    m.findUnique.mockResolvedValue({ name: "Pionnier", _count: { userBadges: 3 } });
    await expect(deleteBadgeAction(form(ID))).resolves.toBeUndefined();
    expect(m.remove).not.toHaveBeenCalled();
    expect(m.revalidatePath).toHaveBeenCalledWith(`/badges/${ID}/edit`);
  });
});

describe("toggleBadgeActiveAction", () => {
  it.each([true, false])("logs a badge that was active=%s being switched", async (isActive) => {
    m.findUnique.mockResolvedValue({ isActive });
    await toggleBadgeActiveAction(form(ID));
    expect(m.update).toHaveBeenCalledWith({ where: { id: ID }, data: { isActive: !isActive } });
    expect(m.auditCreate.mock.calls[0]?.[0].data).toMatchObject({
      actorId: "admin-1",
      action: "badge.active.update",
      targetType: "Badge",
      targetId: ID,
      metadata: { isActive: !isActive },
    });
    expect(m.transaction).toHaveBeenCalledOnce();
  });
});
