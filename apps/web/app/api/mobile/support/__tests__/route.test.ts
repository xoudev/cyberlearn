import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FileTicketResult } from "@/lib/tickets/requester";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  findForUser: vi.fn<(userId: string) => Promise<unknown[]>>(),
  findForRequester: vi.fn<(id: string, userId: string) => Promise<unknown>>(),
  fileAccountTicket: vi.fn<(input: unknown) => Promise<FileTicketResult>>(),
  replyAsRequester: vi.fn<(userId: string, input: unknown) => Promise<unknown>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@cyberlearn/db", () => ({
  ticketRepository: { findForUser: m.findForUser, findForRequester: m.findForRequester },
  isTicketOpen: (status: string) => status === "OPEN" || status === "IN_PROGRESS",
}));
vi.mock("@/lib/tickets/requester", () => ({
  fileAccountTicket: m.fileAccountTicket,
  replyAsRequester: m.replyAsRequester,
}));

const { GET: LIST, POST: FILE } = await import("../route");
const { GET: THREAD } = await import("../ticket/route");
const { POST: REPLY } = await import("../reply/route");

const ME = { id: "user-1", email: "session@example.org" };
const TICKET_ID = "5b7c2d9e-1f3a-4c5b-8d7e-9f0a1b2c3d4e";

function get(path: string): NextRequest {
  return new NextRequest(`https://cyberlearn.fr/api/mobile/support${path}`);
}
function post(path: string, body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`https://cyberlearn.fr/api/mobile/support${path}`, {
    method: "POST",
    body,
    headers,
  });
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue(ME);
});

describe("every support route", () => {
  it.each([
    ["list", () => LIST(get(""))],
    ["file", () => FILE(post("", "{}"))],
    ["thread", () => THREAD(get(`/ticket?id=${TICKET_ID}`))],
    ["reply", () => REPLY(post("/reply", "{}"))],
  ])("refuses a caller the gate turns away (%s): no token, or banned", async (_n, call) => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
    expect(m.findForUser).not.toHaveBeenCalled();
    expect(m.findForRequester).not.toHaveBeenCalled();
    expect(m.fileAccountTicket).not.toHaveBeenCalled();
    expect(m.replyAsRequester).not.toHaveBeenCalled();
  });

  it.each([
    ["file", () => FILE(post("", "pas du json"))],
    ["reply", () => REPLY(post("/reply", "pas du json"))],
  ])("refuses a body that is not JSON (%s)", async (_n, call) => {
    expect((await call()).status).toBe(400);
  });
});

describe("GET /api/mobile/support", () => {
  it("lists the token user's requests, with ISO dates and the reply count", async () => {
    m.findForUser.mockResolvedValue([
      {
        id: TICKET_ID,
        subject: "Vidéo muette",
        theme: "BUG",
        status: "IN_PROGRESS",
        createdAt: new Date("2026-09-20T08:00:00.000Z"),
        updatedAt: new Date("2026-09-24T09:30:00.000Z"),
        _count: { messages: 2 },
      },
    ]);
    const res = await LIST(get(""));
    expect(m.findForUser).toHaveBeenCalledWith("user-1");
    expect(await res.json()).toEqual({
      ok: true,
      tickets: [
        {
          id: TICKET_ID,
          subject: "Vidéo muette",
          theme: "BUG",
          status: "IN_PROGRESS",
          createdAt: "2026-09-20T08:00:00.000Z",
          updatedAt: "2026-09-24T09:30:00.000Z",
          replies: 2,
        },
      ],
    });
  });
});

describe("POST /api/mobile/support", () => {
  const fields = { subject: "Vidéo muette", theme: "BUG", message: "Pas de son sur la leçon 3." };

  it("files as the token's user, through the service that reads the account's address", async () => {
    m.fileAccountTicket.mockResolvedValue({ ok: true, ticketId: TICKET_ID });
    const body = { ...fields, email: "autre@example.org", userId: "x" };
    const res = await FILE(
      post("", JSON.stringify(body), { "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
    );
    expect(res.status).toBe(200);
    // The body goes as it came: the service keeps the request's fields alone,
    // and the address is the account's (lib/tickets/__tests__/requester.test.ts).
    expect(m.fileAccountTicket).toHaveBeenCalledWith({ user: ME, ip: "203.0.113.7", fields: body });
    expect(await res.json()).toEqual({ ok: true, ticketId: TICKET_ID });
  });

  it("passes a refusal on, with the fields at fault", async () => {
    m.fileAccountTicket.mockResolvedValue({
      ok: false,
      error: "Formulaire invalide.",
      fieldErrors: { theme: "Choisis un thème." },
    });
    const res = await FILE(post("", JSON.stringify(fields)));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ fieldErrors: { theme: "Choisis un thème." } });
  });
});

describe("GET /api/mobile/support/ticket", () => {
  it("answers 404 for an id that is not one, without asking", async () => {
    expect((await THREAD(get("/ticket?id=abc"))).status).toBe(404);
    expect(m.findForRequester).not.toHaveBeenCalled();
  });

  it("answers 404 for somebody else's ticket", async () => {
    m.findForRequester.mockResolvedValue(null);
    expect((await THREAD(get(`/ticket?id=${TICKET_ID}`))).status).toBe(404);
    expect(m.findForRequester).toHaveBeenCalledWith(TICKET_ID, "user-1");
  });

  it("sends the thread, names only the team, and whether it takes a reply", async () => {
    const base = {
      id: TICKET_ID,
      subject: "Vidéo muette",
      theme: "BUG",
      message: "Pas de son.",
      createdAt: new Date("2026-09-20T08:00:00.000Z"),
      updatedAt: new Date("2026-09-22T10:00:00.000Z"),
      messages: [
        {
          id: "m-1",
          body: "On regarde.",
          fromStaff: true,
          createdAt: new Date("2026-09-21T08:00:00.000Z"),
          author: { displayName: "Camille" },
        },
        {
          id: "m-2",
          body: "Merci !",
          fromStaff: false,
          createdAt: new Date("2026-09-21T09:00:00.000Z"),
          author: { displayName: "Alex" },
        },
      ],
    };
    m.findForRequester.mockResolvedValue({ ...base, status: "IN_PROGRESS" });
    const open = (await (await THREAD(get(`/ticket?id=${TICKET_ID}`))).json()) as {
      ticket: {
        acceptsReplies: boolean;
        closedAt: string | null;
        messages: { authorName: string | null }[];
      };
    };
    expect(open.ticket.acceptsReplies).toBe(true);
    expect(open.ticket.closedAt).toBeNull();
    expect(open.ticket.messages.map((msg) => msg.authorName)).toEqual(["Camille", null]);

    m.findForRequester.mockResolvedValue({ ...base, status: "RESOLVED" });
    const done = (await (await THREAD(get(`/ticket?id=${TICKET_ID}`))).json()) as {
      ticket: { acceptsReplies: boolean; closedAt: string | null };
    };
    expect(done.ticket.acceptsReplies).toBe(false);
    // When it was closed, for the conclusion the screen words.
    expect(done.ticket.closedAt).toBe("2026-09-22T10:00:00.000Z");
  });
});

describe("POST /api/mobile/support/reply", () => {
  it("replies as the token's user, and passes a refusal on", async () => {
    m.replyAsRequester.mockResolvedValue({ ok: true });
    const body = { ticketId: TICKET_ID, body: "Toujours bloqué." };
    expect((await REPLY(post("/reply", JSON.stringify(body)))).status).toBe(200);
    expect(m.replyAsRequester).toHaveBeenCalledWith("user-1", body);

    m.replyAsRequester.mockResolvedValue({ ok: false, error: "Cette demande est terminée." });
    const res = await REPLY(post("/reply", JSON.stringify(body)));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: "Cette demande est terminée." });
  });
});
