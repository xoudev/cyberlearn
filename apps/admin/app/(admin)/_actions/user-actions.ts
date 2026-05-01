"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@cyberlearn/db";

export async function updateUserRoleAction(
  userId: string,
  newRole: "STUDENT" | "ADMIN",
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const jwtRole = user.app_metadata.user_role as string | undefined;
  let role = jwtRole;
  if (!role) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
    role = dbUser?.role ?? undefined;
  }
  if (role !== "ADMIN") notFound();

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "user.role.update",
      targetType: "User",
      targetId: userId,
      metadata: { newRole },
    },
  });

  revalidatePath("/users");
}
