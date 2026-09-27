import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { pgPoolOptions } from "./connection";

// One client per process, in every environment.
//
// The usual reason for the global is development: hot reload re-evaluates the
// module and each copy would bring its own client. Production has the same
// hazard for a different reason - the apps are bundled, and a module reached
// through two chunks is evaluated twice - and it is the expensive one there.
//
// A client costs almost nothing to construct; what costs is the connection
// pool it opens on its first query, and each extra client opens its own.
// (Before Prisma 7 it was also the engine: detect_platform plus load_engine,
// ~420ms at the median on a cold start. The pg adapter has no engine to load.)
//
// Guarding the cache on NODE_ENV !== "production" left production - the one
// place where that wait is visible to someone - as the only environment with
// no reuse at all.
declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * A client on the pg driver, the only way Prisma 7 talks to Postgres. Exported
 * for the seed and maintenance scripts, which run outside the app and each own
 * the client they disconnect.
 *
 * No URL is not an error here, as it was not under Prisma 6: importing the
 * package must not need a database (unit tests, `next build` collecting page
 * data). The first query is what fails, at connect, as it always did.
 */
export function createPrismaClient(databaseUrl = process.env.DATABASE_URL): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg(databaseUrl ? pgPoolOptions(databaseUrl) : {}),
    log: ["warn", "error"],
  });
}

export const prisma: PrismaClient = (globalThis.__prisma ??= createPrismaClient());
