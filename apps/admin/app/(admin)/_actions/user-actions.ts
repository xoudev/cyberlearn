"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, UserRole } from "@cyberlearn/db";
import { requireAdminAction } from "@/lib/auth";

// nativeEnum rather than a spelled-out list: the accepted values are the ones
// the column can hold, by construction. A hand-written enum here would be one
// more copy to remember - and the one guarding a privilege change is the worst
// place to find out a copy was missed.
const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  newRole: z.nativeEnum(UserRole),
});

export async function updateUserRoleAction(
  userId: string,
  newRole: UserRole,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdminAction();

  const input = updateRoleSchema.safeParse({ userId, newRole });
  if (!input.success) {
    return { ok: false, error: "Paramètres invalides." };
  }

  await prisma.user.update({
    where: { id: input.data.userId },
    data: { role: input.data.newRole },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "user.role.update",
      targetType: "User",
      targetId: input.data.userId,
      metadata: { newRole: input.data.newRole },
    },
  });

  revalidatePath("/users");
  return { ok: true };
}
