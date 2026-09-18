"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { banRepository, moderationRepository, prisma } from "@cyberlearn/db";
import { BAN_DURATIONS, banExpiryFor, isBanDurationKey, moderationNotice } from "@cyberlearn/lib";
import { sendBanNoticeEmail, sendModerationNoticeEmail } from "@cyberlearn/email";
import { requireAdminAction } from "@/lib/auth";
import { env } from "@/lib/env";

/**
 * A person deciding what happens to content the screen took down - and, when it
 * was right, what happens to the account behind it.
 *
 * Both outcomes reach the content: OVERTURNED lifts the block and the message
 * goes back where its author put it; UPHELD destroys it. Both are now also
 * told to the person, which is the half that was missing: their message
 * disappeared, they were told it was being looked at, and then nothing.
 *
 * A sanction is optional and separate. Most confirmed decisions are one clumsy
 * message and deserve nothing beyond the removal; the ones that are not are
 * exactly the ones where making the moderator leave the queue, open the account
 * and ban it from there is how it does not get done.
 */

/** Where somebody reads their own moderation record. */
const RECORD_PATH = "/settings/moderation";

const resolveSchema = z.object({
  eventId: z.string().uuid(),
  outcome: z.enum(["UPHELD", "OVERTURNED"]),
  /** Absent, or one of the ban lengths. Only ever honoured on UPHELD. */
  sanction: z.string().optional(),
});

export async function resolveModerationAction(
  eventId: string,
  outcome: "UPHELD" | "OVERTURNED",
  sanction?: string,
): Promise<{ ok: boolean; sanctionFailed?: boolean }> {
  const admin = await requireAdminAction();
  const parsed = resolveSchema.safeParse({ eventId, outcome, sanction });
  if (!parsed.success) return { ok: false };

  // Read before the content is destroyed: afterwards the excerpt is the only
  // copy of what was flagged, and the notice quotes it.
  const subject = await moderationRepository.findSubject(eventId);

  const applied = await moderationRepository.applyOutcome(eventId, outcome, admin.id);
  // Somebody else got there first. Nothing was changed and nothing is logged:
  // the decision that counts is already recorded under their name.
  if (!applied.claimed) return { ok: false };

  // ── The sanction, when one was asked for ────────────────────────────────
  let sanctionLabel: string | null = null;
  let sanctionFailed = false;
  const author = subject?.user ?? null;

  if (
    outcome === "UPHELD" &&
    sanction !== undefined &&
    sanction !== "none" &&
    isBanDurationKey(sanction) &&
    author !== null
  ) {
    const now = new Date();
    const expiresAt = banExpiryFor(sanction, now);
    const label = BAN_DURATIONS.find((d) => d.key === sanction)?.label ?? sanction;
    const reason = `Contenu supprimé par la modération : « ${subject?.excerpt ?? ""} »`;

    const issued = await banRepository.issue({
      userId: author.id,
      reason: reason.slice(0, 500),
      expiresAt,
      issuedById: admin.id,
      now,
    });

    if (issued.ok) {
      sanctionLabel =
        expiresAt === null ? "bannissement définitif" : `bannissement · ${label.toLowerCase()}`;
      try {
        await sendBanNoticeEmail({
          apiKey: env.RESEND_API_KEY,
          from: env.RESEND_FROM_EMAIL,
          to: author.email,
          displayName: author.displayName || (author.username ?? "toi"),
          reason: reason.slice(0, 500),
          durationLabel:
            expiresAt === null ? "Ce bannissement est définitif." : `Durée : ${label}.`,
          endsOn:
            expiresAt === null
              ? null
              : new Intl.DateTimeFormat("fr-FR", {
                  dateStyle: "long",
                  timeStyle: "short",
                  timeZone: "Europe/Paris",
                }).format(expiresAt),
          appealUrl: `${env.NEXT_PUBLIC_SITE_URL}/banned`,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
        });
      } catch (error) {
        console.error("[moderation] ban notice e-mail failed:", error);
      }
    } else {
      // Already banned. The decision on the content stands; the moderator is
      // told the sanction did not apply rather than left assuming it did.
      sanctionFailed = true;
    }
  }

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: outcome === "UPHELD" ? "moderation.upheld" : "moderation.overturned",
      targetType: "ModerationEvent",
      targetId: eventId,
      metadata: { contentTouched: applied.contentTouched, sanction: sanctionLabel },
    },
  });

  // ── The follow-up, to the person it was about ───────────────────────────
  // Never fatal: the decision is made either way, and a moderator should not
  // see an error on a queue row they have correctly closed.
  if (author !== null) {
    try {
      const notice = moderationNotice({
        stage: outcome === "OVERTURNED" ? "restored" : "removed",
        surface: applied.surface ?? subject?.surface ?? "",
        sanctionLabel,
      });

      await prisma.notification.create({
        data: {
          userId: author.id,
          type: "MODERATION_ALERT",
          title: notice.title,
          body: notice.body,
          actionUrl: RECORD_PATH,
          metadata: { stage: outcome === "OVERTURNED" ? "restored" : "removed" },
        },
      });

      if (author.preferences?.emailNotifications !== false) {
        await sendModerationNoticeEmail({
          apiKey: env.RESEND_API_KEY,
          from: env.RESEND_FROM_EMAIL,
          to: author.email,
          displayName: author.displayName || (author.username ?? "toi"),
          title: notice.title,
          body: notice.body,
          excerpt: subject?.excerpt ?? "",
          recordUrl: `${env.NEXT_PUBLIC_SITE_URL}${RECORD_PATH}`,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
        });
      }
    } catch (error) {
      console.error("[moderation] failed to tell the author:", error);
    }
  }

  revalidatePath("/moderation");
  return sanctionFailed ? { ok: true, sanctionFailed: true } : { ok: true };
}
