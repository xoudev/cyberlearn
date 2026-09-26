import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAction = vi.fn();
vi.mock("@/lib/auth", () => ({ requireAdminAction }));

const resolveNote = vi.fn();
const auditCreate = vi.fn();
vi.mock("@cyberlearn/db", () => ({
  noteReportRepository: { resolveNote },
  prisma: { auditLog: { create: auditCreate } },
}));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath }));

const { resolveNoteReportsAction } = await import("../actions");

const NOTE = "33333333-3333-4333-8333-333333333333";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminAction.mockResolvedValue({ id: "admin-1", email: undefined, role: "ADMIN" });
  resolveNote.mockResolvedValue({ reports: 2, sharesRemoved: 5 });
});

describe("resolveNoteReportsAction", () => {
  it("checks the caller is an admin before anything else", async () => {
    requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(
      resolveNoteReportsAction(form({ noteId: NOTE, outcome: "UNSHARED" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(resolveNote).not.toHaveBeenCalled();
  });

  it("takes the note off every share, and logs what it covered", async () => {
    await resolveNoteReportsAction(form({ noteId: NOTE, outcome: "UNSHARED" }));
    expect(resolveNote).toHaveBeenCalledWith(NOTE, "UNSHARED");
    const [args] = auditCreate.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(args.data).toMatchObject({
      actorId: "admin-1",
      action: "note.report.unshare",
      targetType: "note",
      targetId: NOTE,
      metadata: { reports: 2, sharesRemoved: 5 },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/moderation/notes");
  });

  it("closes the reports without touching the shares when dismissed", async () => {
    resolveNote.mockResolvedValue({ reports: 1, sharesRemoved: 0 });
    await resolveNoteReportsAction(form({ noteId: NOTE, outcome: "DISMISSED" }));
    expect(resolveNote).toHaveBeenCalledWith(NOTE, "DISMISSED");
    const [args] = auditCreate.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(args.data).toMatchObject({ action: "note.report.dismiss" });
  });

  it("does nothing with an outcome or an id it does not know", async () => {
    await resolveNoteReportsAction(form({ noteId: NOTE, outcome: "DELETE" }));
    await resolveNoteReportsAction(form({ noteId: "x", outcome: "UNSHARED" }));
    expect(resolveNote).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });
});
