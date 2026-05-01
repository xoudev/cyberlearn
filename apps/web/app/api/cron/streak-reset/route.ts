import { NextResponse } from "next/server";
import { prisma } from "@cyberlearn/db";

// Vercel Cron: runs daily at midnight UTC (see vercel.json crons config).
// Resets streakDays to 0 for users who missed yesterday — their streak is broken.
export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? ""}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Start of yesterday in UTC. Users with lastActiveAt before this have a gap ≥ 1 full day.
  const startOfYesterday = new Date();
  startOfYesterday.setUTCDate(startOfYesterday.getUTCDate() - 1);
  startOfYesterday.setUTCHours(0, 0, 0, 0);

  const { count } = await prisma.user.updateMany({
    where: {
      streakDays: { gt: 0 },
      lastActiveAt: { lt: startOfYesterday },
    },
    data: { streakDays: 0 },
  });

  return NextResponse.json({ ok: true, reset: count });
}
