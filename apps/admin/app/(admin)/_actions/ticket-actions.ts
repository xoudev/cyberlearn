"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@cyberlearn/db";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export async function updateTicketStatusAction(
  ticketId: string,
  status: TicketStatus,
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const jwtRole = user.app_metadata?.["user_role"] as string | undefined;
  let role = jwtRole;
  if (!role) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
    role = dbUser?.role ?? undefined;
  }
  if (role !== "ADMIN") notFound();

  await prisma.contactTicket.update({
    where: { id: ticketId },
    data: { status },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "ticket.status.update",
      targetType: "ContactTicket",
      targetId: ticketId,
      metadata: { status },
    },
  });

  revalidatePath("/tickets");
}
