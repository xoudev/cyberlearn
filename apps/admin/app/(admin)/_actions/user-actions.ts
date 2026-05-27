"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { requireAdminAction } from "@/lib/auth";

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  newRole: z.enum(["STUDENT", "ADMIN"]),
});

export async function updateUserRoleAction(
  userId: string,
  newRole: "STUDENT" | "ADMIN",
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
