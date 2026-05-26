"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { checkAccountDeletionRequest } from "@/lib/rate-limit";
import { requestDeletion } from "@/lib/rgpd/request-deletion";

const formSchema = z.object({
  confirmation: z.literal("SUPPRIMER", {
    errorMap: () => ({ message: "Vous devez taper SUPPRIMER pour confirmer." }),
  }),
});

export interface RequestDeletionState {
  success?: boolean;
  expiresAt?: string;
  error?: string;
}

export async function requestDeletionAction(
  _prev: RequestDeletionState,
  formData: FormData,
): Promise<RequestDeletionState> {
  const parsed = formSchema.safeParse({ confirmation: formData.get("confirmation") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation échouée." };
  }

  const authUser = await requireRequestUser();

  const rl = await checkAccountDeletionRequest(authUser.id);
  if (!rl.success) {
    const minutes = Math.ceil(rl.retryAfterSeconds / 60);
    return {
      error: `Trop de demandes. Réessayez dans ${String(minutes)} minute${minutes > 1 ? "s" : ""}.`,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, email: true, displayName: true },
  });
  if (!user) return { error: "Utilisateur introuvable." };

  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  const ip = forwarded ? (forwarded.split(",")[0]?.trim() ?? "unknown") : "unknown";
  const userAgent = headersList.get("user-agent") ?? "";

  const result = await requestDeletion(
    { id: user.id, email: user.email, displayName: user.displayName },
    { ip, userAgent },
  );

  if (!result.success) {
    return { error: "Erreur lors de l'envoi. Réessayez ou contactez privacy@cyberlearn.fr." };
  }

  revalidatePath("/settings/data");
  return { success: true, expiresAt: result.expiresAt.toISOString() };
}
