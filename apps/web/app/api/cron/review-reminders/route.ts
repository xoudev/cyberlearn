import { NextResponse } from "next/server";
import { prisma, notificationRepository, reviewCardRepository } from "@cyberlearn/db";

import { errorMessage } from "@cyberlearn/lib/logger";
import { requestLogger } from "@/lib/request-logger";

import { isAuthorizedCron } from "@/lib/cron-auth";

/** Where the reminder leads: the day's recall, in its window over the dashboard. */
const REMINDER_URL = "/dashboard?rappel=1";

// Vercel Cron: runs daily at 08:00 UTC (see vercel.json crons config).
// Sends a REVIEW_REMINDER notification to each reader whose day's recall has
// a question to ask.
export async function GET(request: Request): Promise<NextResponse> {
  // Fail closed, in constant time: see lib/cron-auth.ts.
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);

  // One reminder per reader with a review card due today, among those who
  // want it (the feature and its reminder both on; no preferences row keeps
  // both defaults), and not to somebody whose recall is already done. It
  // says no number: how many questions wait is not what brings anyone back.
  const userIds = await reviewCardRepository.findReminders(now);

  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  // A card stays due until it is answered, so a reader who ignores a
  // reminder would be notified again every day. One reminder per user per
  // day is enough.
  const alreadyNotified = new Set(
    (
      await prisma.notification.findMany({
        where: {
          userId: { in: userIds },
          type: "REVIEW_REMINDER",
          createdAt: { gte: startOfDay },
        },
        select: { userId: true },
      })
    ).map((n) => n.userId),
  );

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const userId of userIds) {
    if (alreadyNotified.has(userId)) {
      skipped++;
      continue;
    }

    // Isolate failures: a single bad user must not stop every later reminder.
    try {
      await notificationRepository.create({
        userId,
        type: "REVIEW_REMINDER",
        title: "Ton rappel du jour est prêt",
        body: "Quelques questions de tes leçons, deux minutes : celles que tu as ratées reviennent avant que tu les oublies.",
        actionUrl: REMINDER_URL,
      });
      sent++;
    } catch (error) {
      failed++;
      const log = await requestLogger();
      log.error(
        { scope: "review-reminders", userId, err: errorMessage(error) },
        "notification failed",
      );
    }
  }

  return NextResponse.json({ ok: true, sent, failed, skipped });
}
