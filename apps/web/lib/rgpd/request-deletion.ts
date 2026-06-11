import crypto from "node:crypto";
import { prisma } from "@cyberlearn/db";
import { sendDeletionConfirmEmail } from "@cyberlearn/email";
import { env } from "@/lib/env";
import { pseudonymize } from "@/lib/pseudonymize";

export interface RequestDeletionSuccess {
  success: true;
  expiresAt: Date;
}

export interface RequestDeletionFailure {
  success: false;
  error: "email_failed" | "internal";
}

export type RequestDeletionResult = RequestDeletionSuccess | RequestDeletionFailure;

/**
 * Generates a deletion token, stores it (hash only), sends the confirmation
 * email, and writes an audit log. Called by both the REST endpoint and the
 * Server Action so logic is not duplicated.
 *
 * Plain token leaves this function exactly once - via the email URL.
 * It is never stored in the DB and never returned to the caller.
 */
export async function requestDeletion(
  user: { id: string; email: string; displayName: string },
  metadata: { ip: string; userAgent: string },
): Promise<RequestDeletionResult> {
  const plainToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const safeUserAgent = metadata.userAgent.slice(0, 500);

  await prisma.accountDeletionToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      ip: pseudonymize(metadata.ip),
      userAgent: safeUserAgent,
    },
  });

  const confirmUrl = `${env.NEXT_PUBLIC_SITE_URL}/api/me/delete/confirm?token=${plainToken}`;

  try {
    await sendDeletionConfirmEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL,
      to: user.email,
      displayName: user.displayName,
      confirmUrl,
    });
  } catch (err) {
    console.error(
      "[rgpd] sendDeletionConfirmEmail failed:",
      err instanceof Error ? err.message : String(err),
    );
    return { success: false, error: "email_failed" };
  }

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "user.account.deletion_requested",
      targetType: "User",
      targetId: user.id,
      ipAddress: pseudonymize(metadata.ip),
      userAgent: safeUserAgent,
    },
  });

  return { success: true, expiresAt };
}
