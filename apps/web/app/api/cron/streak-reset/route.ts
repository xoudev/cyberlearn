import { NextResponse } from "next/server";
import { prisma } from "@cyberlearn/db";
import { applyDayBoundary, dayKey } from "@cyberlearn/lib";

// Vercel Cron: runs daily (see vercel.json crons config).
// For each user with a live streak who did not act yesterday, either consume a
// freeze to preserve the streak or break it - using Europe/Paris day boundaries
// (the same notion of "day" as the activity logic, via dayKey).
export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  // Fail closed: a missing/empty CRON_SECRET must never authorize.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Coarse pre-filter to limit the scan; the exact day-gap decision is made per
  // user by applyDayBoundary. 20h ago is always at least "not today/yesterday"
  // safe to skip - anyone active more recently is still within the grace window.
  const cutoff = new Date(now.getTime() - 20 * 60 * 60 * 1000);

  const candidates = await prisma.user.findMany({
    where: { streakDays: { gt: 0 }, lastActiveAt: { lt: cutoff } },
    select: {
      id: true,
      streakDays: true,
      longestStreak: true,
      streakFreezes: true,
      lastActiveAt: true,
    },
  });

  const frozenIds: { id: string; freezes: number; frozenDay: string | null }[] = [];
  const brokenIds: string[] = [];

  for (const u of candidates) {
    const { state, event } = applyDayBoundary(
      {
        currentStreak: u.streakDays,
        longestStreak: u.longestStreak,
        lastActiveDay: dayKey(u.lastActiveAt),
        freezes: u.streakFreezes,
      },
      now,
    );
    if (event === "frozen") {
      frozenIds.push({ id: u.id, freezes: state.freezes, frozenDay: state.lastActiveDay });
    } else if (event === "broken") {
      brokenIds.push(u.id);
    }
  }

  const ops: Promise<unknown>[] = frozenIds.map((f) =>
    prisma.user.update({
      where: { id: f.id },
      // Advance lastActiveAt to the frozen (yesterday) day so the gap stays
      // consistent on the next run and on the user's next activity.
      data: {
        streakFreezes: f.freezes,
        ...(f.frozenDay ? { lastActiveAt: new Date(`${f.frozenDay}T12:00:00Z`) } : {}),
      },
    }),
  );
  if (brokenIds.length > 0) {
    ops.push(prisma.user.updateMany({ where: { id: { in: brokenIds } }, data: { streakDays: 0 } }));
  }
  // Isolate failures: one bad write must not abort the whole nightly batch.
  const results = await Promise.allSettled(ops);
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    console.error(`[streak-reset] ${String(failed)} streak write(s) failed`);
  }

  return NextResponse.json({
    ok: true,
    scanned: candidates.length,
    frozen: frozenIds.length,
    broken: brokenIds.length,
    failed,
  });
}
