import { NextResponse } from "next/server";
import { prisma, notificationRepository, reviewRepository } from "@cyberlearn/db";

import { errorMessage } from "@cyberlearn/lib/logger";
import { requestLogger } from "@/lib/request-logger";

import { isAuthorizedCron } from "@/lib/cron-auth";

// Vercel Cron: runs daily at 08:00 UTC (see vercel.json crons config).
// Sends REVIEW_REMINDER notifications to users with lessons due today.
export async function GET(request: Request): Promise<NextResponse> {
  // Fail closed, in constant time: see lib/cron-auth.ts.
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setUTCHours(23, 59, 59, 999);
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);

  // One reminder per reader due by the end of today, among those who want
  // it (the feature and its reminder both on; no preferences row keeps both
  // defaults). The count is the session's, five at most: the queue's would
  // announce sixty lessons to somebody the day asks five of.
  const reminders = await reviewRepository.findReminders(endOfDay);

  if (reminders.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  // A schedule stays due until the lesson is actually reviewed, so a user who
  // ignores a reminder was being notified again every single day. One reminder
  // per user per day is enough.
  const alreadyNotified = new Set(
    (
      await prisma.notification.findMany({
        where: {
          userId: { in: reminders.map((r) => r.userId) },
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
  for (const { userId, count, firstTitle } of reminders) {
    if (alreadyNotified.has(userId)) {
      skipped++;
      continue;
    }
    const body =
      count === 1
        ? `Il est temps de revoir "${firstTitle}".`
        : `Tu as ${String(count)} leçons à réviser aujourd'hui.`;

    // Isolate failures: a single bad user must not stop every later reminder.
    try {
      await notificationRepository.create({
        userId,
        type: "REVIEW_REMINDER",
        title: count === 1 ? "Révision recommandée" : `${String(count)} révisions à faire`,
        body,
        actionUrl: "/lessons",
        metadata: { count },
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
