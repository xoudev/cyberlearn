/**
 * A ticket as a conversation, and who may read which one.
 *
 * Two claims are held here. The first is that a ticket belongs to the person
 * who opened it: findForRequester is scoped by the viewer's own id, so knowing
 * an id is not enough to read somebody else's. The second is what a reply does
 * to a ticket's state - the status rule is easy to get subtly wrong, and wrong
 * in a way nobody notices until a resolved ticket quietly reopens itself.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { ticketRepository } from "../repositories/ticket.repository.js";

const suffix = randomUUID().slice(0, 8);

const requester = randomUUID();
const stranger = randomUUID();
const staff = randomUUID();
const USER_IDS = [requester, stranger, staff];

let ticketId = "";
let resolvedTicketId = "";

let configured = false;

async function makeTicket(subject: string, status: "OPEN" | "RESOLVED"): Promise<string> {
  const ticket = await prisma.contactTicket.create({
    data: {
      userId: requester,
      email: `demandeur-${suffix}@t.internal`,
      subject,
      theme: "ESTABLISHMENT_REQUEST",
      message: "Bonjour, j'aimerais ajouter mon lycée.",
      status,
    },
    select: { id: true },
  });
  return ticket.id;
}

describe("tickets (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    await prisma.user.createMany({
      data: [
        { id: requester, email: `tr-${suffix}@t.internal`, displayName: "Demandeur" },
        { id: stranger, email: `tx-${suffix}@t.internal`, displayName: "Inconnu" },
        { id: staff, email: `ta-${suffix}@t.internal`, displayName: "Équipe", role: "ADMIN" },
      ],
    });

    ticketId = await makeTicket(`Ajout du lycée ${suffix}`, "OPEN");
    resolvedTicketId = await makeTicket(`Déjà réglé ${suffix}`, "RESOLVED");

    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.contactTicket.deleteMany({ where: { id: { in: [ticketId, resolvedTicketId] } } });
    // Assigning and noting write audit rows, which would outlive their actor.
    await prisma.auditLog.deleteMany({ where: { actorId: staff } });
    await prisma.user.deleteMany({ where: { id: { in: USER_IDS } } });
  });

  describe("the new theme", () => {
    it("accepts a request to add an establishment", async () => {
      if (!configured) return;
      const row = await prisma.contactTicket.findUnique({
        where: { id: ticketId },
        select: { theme: true },
      });
      expect(row?.theme).toBe("ESTABLISHMENT_REQUEST");
    });
  });

  describe("who can read it", () => {
    it("serves the ticket to the person who opened it", async () => {
      if (!configured) return;
      const ticket = await ticketRepository.findForRequester(ticketId, requester);
      expect(ticket?.subject).toBe(`Ajout du lycée ${suffix}`);
    });

    it("refuses it to anyone else, id or no id", async () => {
      if (!configured) return;
      expect(await ticketRepository.findForRequester(ticketId, stranger)).toBeNull();
    });

    it("names a ticket as the account's own only to the account that opened it", async () => {
      if (!configured) return;
      expect(await ticketRepository.findOwnedId(ticketId, requester)).toBe(ticketId);
      expect(await ticketRepository.findOwnedId(ticketId, stranger)).toBeNull();
    });

    it("files a request open, for the account, and a guest's with none", async () => {
      if (!configured) return;
      const request = {
        subject: `Vidéo muette ${suffix}`,
        theme: "BUG",
        message: "La vidéo de la leçon 3 n'a pas de son sur mon téléphone.",
        email: `demandeur-${suffix}@t.internal`,
      } as const;
      const own = await ticketRepository.create({ ...request, userId: requester });
      const guest = await ticketRepository.create({ ...request, userId: null });
      try {
        const rows = await prisma.contactTicket.findMany({
          where: { id: { in: [own.id, guest.id] } },
          select: { id: true, status: true, userId: true },
        });
        expect(rows.find((r) => r.id === own.id)).toMatchObject({
          status: "OPEN",
          userId: requester,
        });
        expect(rows.find((r) => r.id === guest.id)).toMatchObject({ status: "OPEN", userId: null });
      } finally {
        await prisma.contactTicket.deleteMany({ where: { id: { in: [own.id, guest.id] } } });
      }
    });

    it("lists somebody's own tickets and nobody else's", async () => {
      if (!configured) return;
      const mine = await ticketRepository.findForUser(requester);
      expect(mine.map((t) => t.id).sort()).toEqual([ticketId, resolvedTicketId].sort());
      expect(await ticketRepository.findForUser(stranger)).toEqual([]);
    });
  });

  describe("replying", () => {
    it("adds the turn to the thread, in order, marked as the team's", async () => {
      if (!configured) return;
      await ticketRepository.addMessage({
        ticketId,
        authorId: staff,
        fromStaff: true,
        body: "Bonjour, il nous faut la ville et un contact référent.",
      });
      await ticketRepository.addMessage({
        ticketId,
        authorId: requester,
        fromStaff: false,
        body: "Lyon, et c'est M. Ferrand.",
      });

      const ticket = await ticketRepository.findForRequester(ticketId, requester);
      expect(ticket?.messages.map((m) => m.fromStaff)).toEqual([true, false]);
      expect(ticket?.messages[0]?.body).toContain("ville");
      expect(ticket?.messages[0]?.author?.displayName).toBe("Équipe");
    });

    it("moves an open ticket to in progress, because answering is what that means", async () => {
      if (!configured) return;
      const row = await prisma.contactTicket.findUnique({
        where: { id: ticketId },
        select: { status: true },
      });
      expect(row?.status).toBe("IN_PROGRESS");
    });

    it("refuses a staff reply to a resolved ticket, and writes nothing", async () => {
      if (!configured) return;
      const before = await prisma.ticketMessage.count({ where: { ticketId: resolvedTicketId } });

      const result = await ticketRepository.addMessage({
        ticketId: resolvedTicketId,
        authorId: staff,
        fromStaff: true,
        body: "Pour information, c'est en ligne depuis ce matin.",
      });

      expect(result).toEqual({ ok: false, reason: "TERMINAL" });
      // Refusing has to mean refusing: a message that lands anyway turns a
      // finished ticket into one nobody is watching.
      expect(await prisma.ticketMessage.count({ where: { ticketId: resolvedTicketId } })).toBe(
        before,
      );
    });

    it("refuses the requester the same way, on the same ticket", async () => {
      if (!configured) return;
      const result = await ticketRepository.addMessage({
        ticketId: resolvedTicketId,
        authorId: requester,
        fromStaff: false,
        body: "Toujours bloqué en fait.",
      });

      expect(result).toEqual({ ok: false, reason: "TERMINAL" });
    });

    it("refuses a closed ticket too, from either side", async () => {
      if (!configured) return;
      const closed = await makeTicket(`Clos ${suffix}`, "OPEN");
      await prisma.contactTicket.update({ where: { id: closed }, data: { status: "CLOSED" } });

      expect(
        await ticketRepository.addMessage({
          ticketId: closed,
          authorId: staff,
          fromStaff: true,
          body: "Un mot de plus.",
        }),
      ).toEqual({ ok: false, reason: "TERMINAL" });
      expect(
        await ticketRepository.addMessage({
          ticketId: closed,
          authorId: requester,
          fromStaff: false,
          body: "Et moi aussi.",
        }),
      ).toEqual({ ok: false, reason: "TERMINAL" });
      expect(await prisma.ticketMessage.count({ where: { ticketId: closed } })).toBe(0);
    });

    it("leaves a refused ticket's status and timestamp alone", async () => {
      if (!configured) return;
      const before = await prisma.contactTicket.findUnique({
        where: { id: resolvedTicketId },
        select: { status: true, updatedAt: true },
      });

      await ticketRepository.addMessage({
        ticketId: resolvedTicketId,
        authorId: staff,
        fromStaff: true,
        body: "Encore une tentative.",
      });

      const after = await prisma.contactTicket.findUnique({
        where: { id: resolvedTicketId },
        select: { status: true, updatedAt: true },
      });
      expect(after?.status).toBe("RESOLVED");
      // The bump is what orders both queues. A refused reply must not push a
      // finished ticket back to the top of them.
      expect(after?.updatedAt.getTime()).toBe(before?.updatedAt.getTime());
    });

    it("tells a missing ticket apart from a finished one", async () => {
      if (!configured) return;
      const result = await ticketRepository.addMessage({
        ticketId: randomUUID(),
        authorId: staff,
        fromStaff: true,
        body: "Dans le vide.",
      });
      expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
    });

    it("still takes a reply while the ticket is in progress, without moving it", async () => {
      if (!configured) return;
      const before = await prisma.contactTicket.findUnique({
        where: { id: ticketId },
        select: { status: true },
      });
      expect(before?.status).toBe("IN_PROGRESS");

      const result = await ticketRepository.addMessage({
        ticketId,
        authorId: requester,
        fromStaff: false,
        body: "Merci, je regarde.",
      });

      expect(result).toEqual({ ok: true });
      const after = await prisma.contactTicket.findUnique({
        where: { id: ticketId },
        select: { status: true },
      });
      expect(after?.status).toBe("IN_PROGRESS");
    });

    it("takes the thread with the ticket when the ticket goes", async () => {
      if (!configured) return;
      const doomed = await makeTicket(`Éphémère ${suffix}`, "OPEN");
      await ticketRepository.addMessage({
        ticketId: doomed,
        authorId: staff,
        fromStaff: true,
        body: "Une réponse.",
      });
      await prisma.contactTicket.delete({ where: { id: doomed } });

      expect(await prisma.ticketMessage.count({ where: { ticketId: doomed } })).toBe(0);
    });
  });

  describe("the team's side: assignment and notes", () => {
    it("gives a ticket to an administrator without moving its updatedAt", async () => {
      if (!configured) return;
      const before = await prisma.contactTicket.findUnique({
        where: { id: ticketId },
        select: { updatedAt: true },
      });

      const result = await ticketRepository.assign({ ticketId, assigneeId: staff, actorId: staff });

      expect(result).toEqual({ ok: true, changed: true });
      const after = await prisma.contactTicket.findUnique({
        where: { id: ticketId },
        select: { assigneeId: true, updatedAt: true },
      });
      expect(after?.assigneeId).toBe(staff);
      // updatedAt orders the requester's own list: taking a ticket in hand
      // must not reorder it.
      expect(after?.updatedAt.getTime()).toBe(before?.updatedAt.getTime());
    });

    it("refuses to give a ticket to an account that is not an administrator", async () => {
      if (!configured) return;
      const result = await ticketRepository.assign({
        ticketId,
        assigneeId: stranger,
        actorId: staff,
      });
      expect(result).toEqual({ ok: false, reason: "NOT_ADMIN" });
      const row = await prisma.contactTicket.findUnique({
        where: { id: ticketId },
        select: { assigneeId: true },
      });
      expect(row?.assigneeId).toBe(staff);
    });

    it("adds a note to an open ticket and lists it, without moving updatedAt", async () => {
      if (!configured) return;
      const before = await prisma.contactTicket.findUnique({
        where: { id: ticketId },
        select: { updatedAt: true },
      });

      const result = await ticketRepository.addNote({
        ticketId,
        authorId: staff,
        body: "Lycée déjà connu, voir avec la région.",
      });

      expect(result.ok).toBe(true);
      const notes = await ticketRepository.listNotes(ticketId);
      expect(notes.map((n) => n.body)).toEqual(["Lycée déjà connu, voir avec la région."]);
      expect(notes[0]?.author?.displayName).toBe("Équipe");
      const after = await prisma.contactTicket.findUnique({
        where: { id: ticketId },
        select: { updatedAt: true },
      });
      expect(after?.updatedAt.getTime()).toBe(before?.updatedAt.getTime());
    });

    it("never hands the note or the assignee to the requester's read", async () => {
      if (!configured) return;
      const ticket = await ticketRepository.findForRequester(ticketId, requester);
      expect(ticket).not.toBeNull();
      expect(Object.keys(ticket ?? {})).not.toContain("notes");
      expect(Object.keys(ticket ?? {})).not.toContain("assigneeId");
      expect(JSON.stringify(ticket)).not.toContain("voir avec la région");
    });

    it("refuses a note on a resolved ticket, and writes nothing", async () => {
      if (!configured) return;
      const result = await ticketRepository.addNote({
        ticketId: resolvedTicketId,
        authorId: staff,
        body: "Pour mémoire.",
      });
      expect(result).toEqual({ ok: false, reason: "TERMINAL" });
      expect(await prisma.ticketNote.count({ where: { ticketId: resolvedTicketId } })).toBe(0);
    });

    it("tells a missing ticket apart from a finished one", async () => {
      if (!configured) return;
      expect(
        await ticketRepository.addNote({ ticketId: randomUUID(), authorId: staff, body: "Rien." }),
      ).toEqual({ ok: false, reason: "NOT_FOUND" });
    });

    it("takes the notes with the ticket when the ticket goes", async () => {
      if (!configured) return;
      const doomed = await makeTicket(`Éphémère noté ${suffix}`, "OPEN");
      await ticketRepository.addNote({ ticketId: doomed, authorId: staff, body: "Une note." });
      await prisma.contactTicket.delete({ where: { id: doomed } });

      expect(await prisma.ticketNote.count({ where: { ticketId: doomed } })).toBe(0);
    });
  });
});
