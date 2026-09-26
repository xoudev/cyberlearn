import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isTicketOpen, ticketRepository } from "@cyberlearn/db";
import { userFromBearer } from "../../_lib/auth";

/**
 * One of the mobile user's requests, with its conversation. Scoped to their own
 * id by the repository, so another person's ticket is a 404, not a refusal.
 *
 * `acceptsReplies` is the repository's rule (isTicketOpen), sent rather than
 * recomputed: a resolved or closed request takes no new message, and the app
 * says so without deciding it.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const id = z.string().uuid().safeParse(request.nextUrl.searchParams.get("id"));
  if (!id.success) {
    return NextResponse.json({ ok: false, error: "Demande introuvable." }, { status: 404 });
  }

  const ticket = await ticketRepository.findForRequester(id.data, user.id);
  if (!ticket) {
    return NextResponse.json({ ok: false, error: "Demande introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    ticket: {
      id: ticket.id,
      subject: ticket.subject,
      theme: ticket.theme,
      status: ticket.status,
      message: ticket.message,
      createdAt: ticket.createdAt.toISOString(),
      acceptsReplies: isTicketOpen(ticket.status),
      // A finished ticket takes no message, so its last change is its closing.
      closedAt: isTicketOpen(ticket.status) ? null : ticket.updatedAt.toISOString(),
      messages: ticket.messages.map((m) => ({
        id: m.id,
        body: m.body,
        fromStaff: m.fromStaff,
        createdAt: m.createdAt.toISOString(),
        // Only the team is named: the requester's own turns read "Toi".
        authorName: m.fromStaff ? (m.author?.displayName ?? null) : null,
      })),
    },
  });
}
