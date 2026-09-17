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

    it("leaves a resolved ticket resolved, rather than reopening it on the team's behalf", async () => {
      if (!configured) return;
      // A reply to a resolved ticket is often the note that closes it. The
      // console must not argue with the person using it.
      await ticketRepository.addMessage({
        ticketId: resolvedTicketId,
        authorId: staff,
        fromStaff: true,
        body: "Pour information, c'est en ligne depuis ce matin.",
      });

      const row = await prisma.contactTicket.findUnique({
        where: { id: resolvedTicketId },
        select: { status: true },
      });
      expect(row?.status).toBe("RESOLVED");
    });

    it("never moves the status on a reply from the requester", async () => {
      if (!configured) return;
      const before = await prisma.contactTicket.findUnique({
        where: { id: resolvedTicketId },
        select: { status: true },
      });
      await ticketRepository.addMessage({
        ticketId: resolvedTicketId,
        authorId: requester,
        fromStaff: false,
        body: "Merci !",
      });
      const after = await prisma.contactTicket.findUnique({
        where: { id: resolvedTicketId },
        select: { status: true },
      });
      expect(after?.status).toBe(before?.status);
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
});
