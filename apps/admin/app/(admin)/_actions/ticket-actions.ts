"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { requireAdminAction } from "@/lib/auth";

const updateStatusSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export async function updateTicketStatusAction(
  ticketId: string,
  status: TicketStatus,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdminAction();

  const input = updateStatusSchema.safeParse({ ticketId, status });
  if (!input.success) {
    return { ok: false, error: "Paramètres invalides." };
  }

  await prisma.contactTicket.update({
    where: { id: input.data.ticketId },
    data: { status: input.data.status },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "ticket.status.update",
      targetType: "ContactTicket",
      targetId: input.data.ticketId,
      metadata: { status: input.data.status },
    },
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${input.data.ticketId}`);
  return { ok: true };
}
