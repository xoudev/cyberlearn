import { type NextRequest, NextResponse } from "next/server";
import { prisma, ticketRepository } from "@cyberlearn/db";
import { fileTicket } from "@/lib/tickets/requester";
import { userFromBearer } from "../_lib/auth";

/**
 * The mobile user's help requests (the site's /support), and filing a new one
 * (the site's contact form). Through the repository rather than reads under
 * RLS: the list, the thread and the rule on which tickets still take a reply
 * are written there once, for the site, the console and the app.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const tickets = await ticketRepository.findForUser(user.id);
  return NextResponse.json({
    ok: true,
    tickets: tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      theme: t.theme,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      replies: t._count.messages,
    })),
  });
}

/**
 * Files a request as the signed-in account, answered at the account's address:
 * the app does not ask for one, and a reply sent to an address typed on a
 * phone keyboard is a reply that may never arrive. Same validation and rate
 * limit as the contact form.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }
  // SAFETY: an unknown JSON body; each field is validated by the service.
  const { subject, theme, message } = (body ?? {}) as {
    subject?: unknown;
    theme?: unknown;
    message?: unknown;
  };

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true },
  });
  const email = profile?.email ?? user.email;
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Aucune adresse e-mail sur ce compte pour te répondre." },
      { status: 409 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const result = await fileTicket({
    userId: user.id,
    ip,
    fields: { subject, theme, message, email },
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
