import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@cyberlearn/db";
import { Redis } from "@upstash/redis";

import { errorMessage } from "@cyberlearn/lib/logger";
import { requestLogger } from "@/lib/request-logger";

import { isAuthorizedCron } from "@/lib/cron-auth";
import { trackCronRun } from "@/lib/cron-run";
import { keepAliveFailure, type PingResults } from "@/lib/keep-alive";

// Called every 6 hours by cron-job.org, not by Vercel: it is not in vercel.json
// (docs/infra/keep-alive.md). Keeps Supabase and Upstash warm - Supabase Free
// pauses after 7 days of inactivity.

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A failed ping is answered, not thrown: the run is recorded as failed all
  // the same, with the service that did not answer. The answer keeps its
  // timestamp; the record has its own date, and keeps the two statuses.
  const results = await trackCronRun("keep-alive", ping, {
    failure: keepAliveFailure,
    summary: ({ postgres, redis }) => ({ postgres, redis }),
  });
  return NextResponse.json(results);
}

async function ping(): Promise<PingResults & { timestamp: string }> {
  const results: PingResults & { timestamp: string } = {
    timestamp: new Date().toISOString(),
    postgres: "unknown",
    redis: "unknown",
  };

  // Ping Postgres (Supabase) - minimal query to keep the DB warm
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.postgres = "ok";
  } catch (err) {
    results.postgres = "error";
    const log = await requestLogger();
    log.error({ scope: "keep-alive", err: errorMessage(err) }, "postgres ping failed");
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
      const log = await requestLogger();
      log.error({ scope: "keep-alive", err: errorMessage(err) }, "redis ping failed");
    }
  }

  return results;
}
