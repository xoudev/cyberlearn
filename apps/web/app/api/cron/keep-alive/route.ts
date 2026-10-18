import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@cyberlearn/db";
import { Redis } from "@upstash/redis";

import { errorMessage } from "@cyberlearn/lib/logger";
import { requestLogger } from "@/lib/request-logger";

import { isAuthorizedCron } from "@/lib/cron-auth";
import { trackCronRun } from "@/lib/cron-run";

// Called every 6 hours by cron-job.org, not by Vercel: it is not in vercel.json
// (docs/infra/keep-alive.md). Keeps Supabase and Upstash warm - Supabase Free
// pauses after 7 days of inactivity.

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A failed ping is answered, not thrown: the run is recorded as failed all
  // the same, with the service that did not answer.
  const results = await trackCronRun("keep-alive", ping, {
    failure: (r) => {
      const down = [
        r.postgres === "error" ? "postgres" : null,
        r.redis === "error" ? "redis" : null,
      ].filter((name) => name !== null);
      return down.length === 0 ? null : `ping failed: ${down.join(", ")}`;
    },
  });
  return NextResponse.json(results);
}

type PingStatus = "ok" | "error" | "unknown";

async function ping(): Promise<{ timestamp: string; postgres: PingStatus; redis: PingStatus }> {
  const results = {
    timestamp: new Date().toISOString(),
    postgres: "unknown" as PingStatus,
    redis: "unknown" as PingStatus,
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
