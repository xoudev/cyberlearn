"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  certificateRepository,
  type ReinstateCertificateResult,
  type RevokeCertificateResult,
} from "@cyberlearn/db";
import { certificateCode } from "@cyberlearn/lib/social/certificate-code";
import { requireAdminAction } from "@/lib/auth";
import { reinstatedNotice, revokedNotice } from "@/lib/certificate-notice";

import { logger, errorMessage } from "@cyberlearn/lib/logger";

export interface CertificateActionState {
  ok?: boolean;
  error?: string;
}

const GONE = "Ce certificat n'existe plus.";

const revokeSchema = z.object({
  certificateId: z.guid(),
  /**
   * Required: the holder reads it in their notice and on their certificates
   * page, and anyone holding the verification address reads it there. A
   * revocation with no reason is one nobody can answer.
   */
  reason: z
    .string()
    .trim()
    .min(5, "Explique le motif : au moins 5 caractères.")
    .max(500, "Le motif tient en 500 caractères au plus."),
});

const reinstateSchema = z.object({ certificateId: z.guid() });

/** The pages that show the certificate in the console. */
function revalidateCertificate(userId: string | null): void {
  revalidatePath("/certificates");
  if (userId !== null) revalidatePath(`/users/${userId}`);
}

/**
 * Revokes a certificate from the console's list.
 *
 * The repository writes the revocation, its audit row and the holder's notice
 * in one transaction, and only on a certificate that is still valid: a second
 * click, or a second administrator on the same row, changes nothing and says
 * so. The certificate's number, its PDF and the holder's completed path stay
 * as they are, so the same certificate can be put back.
 */
export async function revokeCertificateAction(
  _prev: CertificateActionState,
  formData: FormData,
): Promise<CertificateActionState> {
  const admin = await requireAdminAction();
  const parsed = revokeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const cert = await certificateRepository.findForConsole(parsed.data.certificateId);
  if (cert === null) return { error: GONE };

  let result: RevokeCertificateResult;
  try {
    result = await certificateRepository.revoke({
      id: cert.id,
      reason: parsed.data.reason,
      actorId: admin.id,
      now: new Date(),
      notice: revokedNotice(cert.path.title, parsed.data.reason),
      metadata: {
        code: certificateCode(cert.publicId, cert.issuedAt),
        pathTitle: cert.path.title,
      },
    });
  } catch (error) {
    logger.error({ scope: "certificates", err: errorMessage(error) }, "revocation failed");
    return { error: "La révocation a échoué. Rien n'a été modifié." };
  }
  if (!result.ok) {
    return { error: result.reason === "NOT_FOUND" ? GONE : "Ce certificat est déjà révoqué." };
  }

  revalidateCertificate(cert.userId);
  return { ok: true };
}

/**
 * Puts a revoked certificate back, for a revocation made in error: valid again
 * under the same number, with the same PDF, whose fingerprint never changed.
 * Traced, with the reason it clears, and the holder is told.
 */
export async function reinstateCertificateAction(
  _prev: CertificateActionState,
  formData: FormData,
): Promise<CertificateActionState> {
  const admin = await requireAdminAction();
  const parsed = reinstateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Paramètres invalides." };

  const cert = await certificateRepository.findForConsole(parsed.data.certificateId);
  if (cert === null) return { error: GONE };

  let result: ReinstateCertificateResult;
  try {
    result = await certificateRepository.reinstate({
      id: cert.id,
      actorId: admin.id,
      notice: reinstatedNotice(cert.path.title),
      metadata: {
        code: certificateCode(cert.publicId, cert.issuedAt),
        pathTitle: cert.path.title,
      },
    });
  } catch (error) {
    logger.error({ scope: "certificates", err: errorMessage(error) }, "reinstatement failed");
    return { error: "Le rétablissement a échoué. Rien n'a été modifié." };
  }
  if (!result.ok) {
    return { error: result.reason === "NOT_FOUND" ? GONE : "Ce certificat n'est pas révoqué." };
  }

  revalidateCertificate(cert.userId);
  return { ok: true };
}
