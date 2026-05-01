import { NextResponse } from "next/server";
import { prisma, notificationRepository } from "@cyberlearn/db";

// Vercel Cron: runs daily at 08:00 UTC (see vercel.json crons config).
// Sends REVIEW_REMINDER notifications to users with lessons due today.
export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? ""}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Find all review schedules due by end of today, with user preferences
  const dueSchedules = await prisma.reviewSchedule.findMany({
    where: {
      nextReviewAt: { lte: endOfDay },
    },
    select: {
      userId: true,
      lessonId: true,
      lesson: { select: { title: true, slug: true } },
      user: {
        select: {
          preferences: { select: { emailNotifications: true } },
        },
      },
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

  let sent = 0;
  for (const [userId, { count, titles }] of byUser) {
    const firstTitle = titles[0] ?? "";
    const body =
      count === 1
        ? `Il est temps de revoir "${firstTitle}".`
        : `Tu as ${String(count)} leçons à réviser aujourd'hui.`;

    await notificationRepository.create({
      userId,
      type: "REVIEW_REMINDER",
      title: count === 1 ? "Révision recommandée" : `${String(count)} révisions à faire`,
      body,
      actionUrl: "/lessons",
      metadata: { count },
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
