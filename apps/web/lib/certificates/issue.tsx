// Certificate issuance — plain server module (NOT "use server"): callable only
// from server code (lesson-completion action + quiz-submit action), never
// exposed as a client-invocable server action (which would let a client forge a
// cert with an arbitrary userId/score).

import crypto from "node:crypto";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import {
  badgeRepository,
  certificateRepository,
  notificationRepository,
  pathRepository,
  prisma,
  userRepository,
} from "@cyberlearn/db";
import { createSupabaseAdminClient } from "@cyberlearn/db/supabase/admin";
import { evaluateBadges } from "@cyberlearn/lib";
import { CertificateDocument } from "@/lib/pdf/certificate-template";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyberlearn.fr";
const BUCKET = "certificates";

export interface IssueOptions {
  score?: number;
  passThreshold?: number;
}

/** Generate → hash → upload → create the certificate row (with score). */
async function generateCertificatePdf(
  userId: string,
  pathId: string,
  opts: IssueOptions,
): Promise<string | null> {
  const [user, path] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
    prisma.path.findUnique({ where: { id: pathId }, select: { title: true } }),
  ]);
  if (!user || !path) return null;

  const issuedAt = new Date();
  const certRecord = await certificateRepository.create({
    userId,
    pathId,
    sha256Hash: "pending", // filled after PDF generation
    pdfStorageKey: "pending",
    // Omit when absent (exactOptionalPropertyTypes) — quiz-less certs keep score null.
    ...(opts.score !== undefined ? { score: opts.score } : {}),
    ...(opts.passThreshold !== undefined ? { passThreshold: opts.passThreshold } : {}),
  });

  const verifyUrl = `${APP_URL}/verify/${certRecord.publicId}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1 });

  const pdfBuffer = await renderToBuffer(
    <CertificateDocument
      displayName={user.displayName}
      pathTitle={path.title}
      issuedAt={issuedAt}
      publicId={certRecord.publicId}
      sha256Hash=""
      qrCodeDataUrl={qrCodeDataUrl}
      appUrl={APP_URL}
    />,
  );

  const sha256Hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
  const storageKey = `${userId}/${certRecord.id}.pdf`;

  const supabase = createSupabaseAdminClient();
  await supabase.storage.from(BUCKET).upload(storageKey, pdfBuffer, {
    contentType: "application/pdf",
    cacheControl: "public, max-age=31536000, immutable",
    upsert: false,
  });

  await prisma.certificate.update({
    where: { id: certRecord.id },
    data: { sha256Hash, pdfStorageKey: storageKey },
  });

  return certRecord.id;
}

/**
 * Issue the certificate for (userId, pathId): gate-check → generate → mark the
 * path COMPLETED → notify → award PATH_COMPLETED badges. Safe to call from both
 * the lesson-completion path (no quiz, score omitted) and the quiz-pass path.
 *
 * Internal guards (gate + idempotence):
 *  - lessons not complete → no-op (a passing quiz without finished lessons emits nothing)
 *  - path already COMPLETED or a cert already linked → no-op (avoids the
 *    @@unique([userId, pathId]) throwing on create)
 */
export async function issueCertificate(
  userId: string,
  pathId: string,
  opts: IssueOptions = {},
): Promise<{ issued: boolean; certId?: string }> {
  const [lessonsComplete, existing, path] = await Promise.all([
    pathRepository.areLessonsComplete(userId, pathId),
    pathRepository.findProgress(userId, pathId),
    prisma.path.findUnique({ where: { id: pathId }, select: { title: true, slug: true } }),
  ]);

  if (!lessonsComplete || !path) return { issued: false };
  if (existing?.status === "COMPLETED" || existing?.certificateId) return { issued: false };

  const certId = await generateCertificatePdf(userId, pathId, opts);

  if (certId) {
    await pathRepository.linkCertificate(userId, pathId, certId);
    await Promise.all([
      notificationRepository.create({
        userId,
        type: "PATH_COMPLETED",
        title: `Parcours terminé : ${path.title}`,
        body: "Félicitations ! Tu as complété tous les modules de ce parcours.",
        actionUrl: `/paths/${path.slug}`,
      }),
      notificationRepository.create({
        userId,
        type: "CERTIFICATE_ISSUED",
        title: "Certificat émis",
        body: `Ton certificat pour "${path.title}" est disponible.`,
        actionUrl: `/api/certificates/${certId}/download`,
        metadata: { certId, pathTitle: path.title },
      }),
    ]);
  } else {
    // Preserve existing behaviour: mark COMPLETED even if PDF generation failed.
    // (Pre-existing edge case — a COMPLETED path without a cert — tracked for a
    // separate fix; not changed here.)
    await pathRepository.upsertProgress({
      userId,
      pathId,
      status: "COMPLETED",
      completedAt: new Date(),
    });
    await notificationRepository.create({
      userId,
      type: "PATH_COMPLETED",
      title: `Parcours terminé : ${path.title}`,
      body: "Félicitations ! Tu as complété tous les modules de ce parcours.",
      actionUrl: `/paths/${path.slug}`,
    });
  }

  await awardPathCompletedBadges(userId, pathId);
  return certId ? { issued: true, certId } : { issued: true };
}

/** Evaluates and awards any PATH_COMPLETED badges triggered by a newly completed path. */
async function awardPathCompletedBadges(userId: string, pathId: string): Promise<void> {
  const [allBadges, earnedIds, user, lessonCounts, totalCertificates] = await Promise.all([
    badgeRepository.findAllActive(),
    badgeRepository.findUserBadgeIds(userId),
    userRepository.findForGamification(userId),
    userRepository.countCompletedLessonsByCategory(userId),
    prisma.certificate.count({ where: { userId } }),
  ]);

  if (!user || allBadges.length === 0) return;

  const newBadgeIds = evaluateBadges(allBadges, earnedIds, {
    xpTotal: user.xpTotal,
    streakDays: user.streakDays,
    totalLessonsCompleted: lessonCounts.total,
    categoryLessonCounts: lessonCounts.byCategory,
    completedPathId: pathId,
    totalCertificates,
  });

  if (newBadgeIds.length === 0) return;

  const earnedBadges = allBadges.filter((b) => newBadgeIds.includes(b.id));
  await prisma.$transaction([
    prisma.userBadge.createMany({
      data: newBadgeIds.map((badgeId) => ({ userId, badgeId, context: { pathId } })),
      skipDuplicates: true,
    }),
    prisma.notification.createMany({
      data: earnedBadges.map((badge) => ({
        userId,
        type: "BADGE_EARNED" as const,
        title: `Badge obtenu : ${badge.name}`,
        body: badge.description,
        actionUrl: "/badges",
        metadata: { badgeId: badge.id, rarity: badge.rarity as string },
      })),
    }),
  ]);
}
