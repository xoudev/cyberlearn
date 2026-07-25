// Certificate issuance: plain server module (NOT "use server"), callable only
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
import { buildBadgeCriterionStats, evaluateBadges } from "@cyberlearn/lib";
import { awardBadges } from "@/lib/badges/award";
import { CertificateDocument } from "@/lib/pdf/certificate-template";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyberlearn.fr";
const BUCKET = "certificates";

export interface IssueOptions {
  score?: number;
  passThreshold?: number;
}

/**
 * Generate → hash → upload → create the certificate row (with score).
 *
 * The id and publicId are minted here rather than by the database so the QR
 * code and the storage key are known before anything is persisted. That lets
 * the row be written once, already complete: a crash or a failed upload leaves
 * no certificate at all instead of a half-written one.
 *
 * This matters because sha256Hash is globally UNIQUE. Seeding it with a
 * placeholder made two concurrent issuances collide, and a single row stuck on
 * that placeholder would have blocked every future issuance platform-wide.
 */
async function generateCertificatePdf(
  userId: string,
  pathId: string,
  opts: IssueOptions,
): Promise<string | null> {
  const [user, path] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, username: true },
    }),
    prisma.path.findUnique({
      where: { id: pathId },
      select: { title: true, _count: { select: { lessons: true } } },
    }),
  ]);
  if (!user || !path) return null;

  const issuedAt = new Date();
  const certId = crypto.randomUUID();
  const publicId = crypto.randomUUID();

  const verifyUrl = `${APP_URL}/verify/${publicId}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1 });

  const pdfBuffer = await renderToBuffer(
    <CertificateDocument
      displayName={user.displayName}
      username={user.username}
      pathTitle={path.title}
      issuedAt={issuedAt}
      publicId={publicId}
      score={opts.score ?? null}
      lessonCount={path._count.lessons}
      qrCodeDataUrl={qrCodeDataUrl}
      appUrl={APP_URL}
    />,
  );

  const sha256Hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
  const storageKey = `${userId}/${certId}.pdf`;

  // The Supabase client reports storage failures in `error` instead of
  // throwing, so an unchecked call would persist a key pointing at nothing.
  const supabase = createSupabaseAdminClient();
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storageKey, pdfBuffer, {
    contentType: "application/pdf",
    cacheControl: "public, max-age=31536000, immutable",
    upsert: false,
  });
  if (uploadError) {
    console.error("[certificates] PDF upload failed:", uploadError.message);
    return null;
  }

  await certificateRepository.create({
    id: certId,
    publicId,
    userId,
    pathId,
    issuedAt,
    sha256Hash,
    pdfStorageKey: storageKey,
    // Omit when absent (exactOptionalPropertyTypes): quiz-less certs keep score null.
    ...(opts.score !== undefined ? { score: opts.score } : {}),
    ...(opts.passThreshold !== undefined ? { passThreshold: opts.passThreshold } : {}),
  });

  return certId;
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
    // (Pre-existing edge case: a COMPLETED path without a cert, tracked for a
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
  const [allBadges, earnedIds, user, facts] = await Promise.all([
    badgeRepository.findAllActive(),
    badgeRepository.findUserBadgeIds(userId),
    userRepository.findForGamification(userId),
    badgeRepository.findCriterionFacts(userId),
  ]);

  if (!user || allBadges.length === 0) return;

  // The triggering path is normally already persisted as COMPLETED at this
  // point (linkCertificate / upsertProgress run first); merge it defensively.
  if (!facts.completedPathIds.includes(pathId)) {
    facts.completedPathIds.push(pathId);
  }

  const newBadgeIds = evaluateBadges(allBadges, earnedIds, buildBadgeCriterionStats(facts, user));

  if (newBadgeIds.length === 0) return;

  // Shared award primitive: inserts the rows, credits Badge.xpReward (+ level
  // recompute) and notifies, all atomically, and only for rows actually
  // inserted, so concurrent or repeated calls never double-credit.
  const earnedBadges = allBadges.filter((b) => newBadgeIds.includes(b.id));
  await prisma.$transaction(async (tx) => {
    await awardBadges(tx, userId, earnedBadges, { pathId });
  });
}
