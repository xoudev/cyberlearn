"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteAccount, prisma, UserRole } from "@cyberlearn/db";
import { sendAccountDeletedEmail } from "@cyberlearn/email";
import { requireAdminAction } from "@/lib/auth";
import { env } from "@/lib/env";

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

// ─── Deletion ───────────────────────────────────────────────────────────────

const deleteUserSchema = z.object({
  userId: z.string().uuid(),
  /**
   * The account's own e-mail, typed back by the administrator.
   *
   * Not a checkbox and not a modal: the one thing that separates deleting the
   * right account from deleting the one above it in a sorted list is having
   * looked at which row you are on. Typing the address is how you look.
   */
  confirmEmail: z.string().trim().toLowerCase().email(),
  /** Shown to the person in the notice. Nothing is invented when absent. */
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});

export interface DeleteUserState {
  error?: string;
  ok?: boolean;
  /** True when the erasure ran but the notice could not be delivered. */
  emailFailed?: boolean;
  /** True when auth.users outlived public.users - a loose end worth naming. */
  authSurvived?: boolean;
}

export async function deleteUserAction(
  _prev: DeleteUserState,
  formData: FormData,
): Promise<DeleteUserState> {
  const admin = await requireAdminAction();
  const parsed = deleteUserSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Adresse de confirmation invalide." };

  // Read before erasing: afterwards there is no address to write to and no name
  // to write to it with.
  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, email: true, displayName: true, username: true, role: true },
  });
  if (!target) return { error: "Ce compte n'existe plus." };

  if (target.email.toLowerCase() !== parsed.data.confirmEmail) {
    return { error: "L'adresse saisie ne correspond pas à ce compte." };
  }

  // An administrator deleting their own account from the console would erase
  // the session they are holding, mid-request. The self-service flow exists and
  // asks for a confirmation by e-mail, which is the right way round.
  if (target.id === admin.id) {
    return { error: "Supprime ton propre compte depuis tes paramètres, pas depuis la console." };
  }

  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  const ip = forwarded ? (forwarded.split(",")[0]?.trim() ?? "unknown") : "unknown";

  let summary;
  try {
    summary = await deleteAccount(target.id, {
      ip,
      userAgent: requestHeaders.get("user-agent") ?? "",
      actorId: admin.id,
      // Distinct from the self-service action, so the audit log can tell apart
      // someone who left from someone who was removed.
      action: "admin.user.deleted",
    });
  } catch (error) {
    console.error("[admin] deleteUserAction failed:", error);
    return { error: "La suppression a échoué. Rien n'a été effacé." };
  }

  // After the erasure, never before it. Sending first would mean telling
  // someone their account is gone and then failing to delete it; sending after
  // means the notice is always true, and a mail that does not go out is a
  // missing notice rather than a false one.
  let emailFailed = false;
  try {
    await sendAccountDeletedEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL,
      to: target.email,
      displayName: target.displayName || (target.username ?? "toi"),
      deletedAt: new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Paris",
      }).format(summary.deletedAt),
      contactEmail: env.RESEND_FROM_EMAIL,
      reason: parsed.data.reason === "" ? undefined : parsed.data.reason,
    });
  } catch (error) {
    // The account is already gone; nothing here can put it back. The failure is
    // recorded where it can still be acted on rather than thrown away.
    emailFailed = true;
    console.error("[admin] account deletion notice failed:", error);
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorHashedId: summary.hashedUserId,
        action: "admin.user.deleted.notice_failed",
        targetType: "user",
        targetId: summary.hashedUserId,
        anonymized: true,
        metadata: { error: error instanceof Error ? error.message : String(error) },
      },
    });
  }

  revalidatePath("/users");
  return { ok: true, emailFailed, authSurvived: !summary.authIdentityDeleted };
}
