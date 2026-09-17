import { NextResponse } from "next/server";
import { prisma, notificationRepository } from "@cyberlearn/db";

// Vercel Cron: runs daily at 08:00 UTC (see vercel.json crons config).
// Sends REVIEW_REMINDER notifications to users with lessons due today.
export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  // Fail closed: a missing/empty CRON_SECRET must never authorize.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setUTCHours(23, 59, 59, 999);
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);

  // Find all review schedules due by end of today, for users who want them.
  // The preference was previously read but never applied, so opting out of
  // review reminders in the settings had no effect. A user with no preferences
  // row keeps the schema default (reviewReminders = true), which is what the
  // settings page shows them.
  const dueSchedules = await prisma.reviewSchedule.findMany({
    where: {
      nextReviewAt: { lte: endOfDay },
      // Two switches, and both have to be on. spacedRepetition turns the
      // feature off; reviewReminders turns off only this e-mail. Reading the
      // second alone would keep mailing about a queue the reader has said they
      // do not want to have.
      user: {
        OR: [
          { preferences: { is: null } },
          { preferences: { is: { spacedRepetition: true, reviewReminders: true } } },
        ],
      },
    },
    select: {
      userId: true,
      lessonId: true,
      lesson: { select: { title: true, slug: true } },
    },
  });

  if (dueSchedules.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  // Group by userId to send one notification per user with count
  const byUser = new Map<string, { count: number; titles: string[] }>();
  for (const s of dueSchedules) {
    const existing = byUser.get(s.userId);
    if (existing) {
      existing.count++;
      existing.titles.push(s.lesson.title);
    } else {
      byUser.set(s.userId, { count: 1, titles: [s.lesson.title] });
    }
  }

  // A schedule stays due until the lesson is actually reviewed, so a user who
  // ignores a reminder was being notified again every single day. One reminder
  // per user per day is enough.
  const alreadyNotified = new Set(
    (
      await prisma.notification.findMany({
        where: {
          userId: { in: [...byUser.keys()] },
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
  for (const [userId, { count, titles }] of byUser) {
    if (alreadyNotified.has(userId)) {
      skipped++;
      continue;
    }
    const firstTitle = titles[0] ?? "";
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
      console.error(`[review-reminders] notification failed for user ${userId}:`, error);
    }
  }

  return NextResponse.json({ ok: true, sent, failed, skipped });
}
