import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The window's request goes through the session and the shared service, as
 * the account, from the reader's address; "Mes demandes" is refreshed only
 * when a request was filed.
 */

const m = vi.hoisted(() => ({
  requireRequestUser: vi.fn<() => Promise<{ id: string; email?: string }>>(),
  fileAccountTicket: vi.fn<(input: unknown) => Promise<unknown>>(),
  revalidatePath: vi.fn<(path: string) => void>(),
  forwardedFor: null as string | null,
}));

vi.mock("@/lib/auth", () => ({ requireRequestUser: m.requireRequestUser }));
vi.mock("@/lib/tickets/requester", () => ({ fileAccountTicket: m.fileAccountTicket }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve(new Headers(m.forwardedFor ? { "x-forwarded-for": m.forwardedFor } : {})),
}));

const { fileRequestAction } = await import("../request-actions");

const INPUT = { theme: "BUG", subject: "Vidéo muette", message: "Pas de son sur la leçon 3." };
const TICKET_ID = "5b7c2d9e-1f3a-4c5b-8d7e-9f0a1b2c3d4e";

beforeEach(() => {
  vi.clearAllMocks();
  m.forwardedFor = "203.0.113.7, 10.0.0.1";
  m.requireRequestUser.mockResolvedValue({ id: "user-1", email: "session@example.org" });
});

describe("fileRequestAction", () => {
  it("files as the signed-in account, from the reader's address, and refreshes the list", async () => {
    m.fileAccountTicket.mockResolvedValue({ ok: true, ticketId: TICKET_ID });
    expect(await fileRequestAction(INPUT)).toEqual({ ok: true, ticketId: TICKET_ID });
    expect(m.fileAccountTicket).toHaveBeenCalledWith({
      user: { id: "user-1", email: "session@example.org" },
      ip: "203.0.113.7",
      fields: INPUT,
    });
    expect(m.revalidatePath).toHaveBeenCalledWith("/support");
  });

  it("passes a refusal on, and refreshes nothing", async () => {
    const refusal = { ok: false, error: "Trop de demandes. Réessayez dans 30 secondes." };
    m.fileAccountTicket.mockResolvedValue(refusal);
    m.forwardedFor = null;
    m.requireRequestUser.mockResolvedValue({ id: "user-1" });
    expect(await fileRequestAction(INPUT)).toEqual(refusal);
    expect(m.fileAccountTicket).toHaveBeenCalledWith({
      user: { id: "user-1", email: null },
      ip: "unknown",
      fields: INPUT,
    });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("writes nothing for a reader the session turns away", async () => {
    m.requireRequestUser.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(fileRequestAction(INPUT)).rejects.toThrow("NEXT_REDIRECT");
    expect(m.fileAccountTicket).not.toHaveBeenCalled();
  });
});
