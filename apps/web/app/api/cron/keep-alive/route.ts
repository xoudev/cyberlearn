import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@cyberlearn/db";
import { Redis } from "@upstash/redis";

// Vercel Cron: runs every 6 hours (see vercel.json).
// Keeps Supabase and Upstash warm - Supabase Free pauses after 7 days of inactivity.

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET ?? ""}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    timestamp: new Date().toISOString(),
    postgres: "unknown" as "ok" | "error" | "unknown",
    redis: "unknown" as "ok" | "error" | "unknown",
  };

  // Ping Postgres (Supabase) - minimal query to keep the DB warm
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.postgres = "ok";
  } catch (err) {
    results.postgres = "error";
    console.error(
      "[keep-alive] postgres ping failed:",
      err instanceof Error ? err.message : String(err),
    );
  }

  // Ping Redis (Upstash) - minimal GET to keep the instance warm
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      const redis = new Redis({ url, token });
      await redis.get("keep-alive");
      results.redis = "ok";
    } catch (err) {
      results.redis = "error";
      console.error(
        "[keep-alive] redis ping failed:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return NextResponse.json(results);
}
