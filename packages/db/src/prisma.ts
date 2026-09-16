import { PrismaClient } from "@prisma/client";

// One client per process, in every environment.
//
// The usual reason for the global is development: hot reload re-evaluates the
// module and each copy would bring its own client. Production has the same
// hazard for a different reason - the apps are bundled, and a module reached
// through two chunks is evaluated twice - and it is the expensive one there.
//
// A client costs almost nothing to construct (~2ms); what costs is the engine
// it loads on its first query. Sentry measures that in production as
// prisma:client:detect_platform, median ~330ms and up to 2s, followed by
// prisma:client:load_engine, median ~90ms. Every extra client pays it again,
// and on a cold start the user is the one waiting.
//
// Guarding the cache on NODE_ENV !== "production" left production - the one
// place where that wait is visible to someone - as the only environment with
// no reuse at all.
declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: ["warn", "error"],
  });
}

export const prisma: PrismaClient = (globalThis.__prisma ??= createPrismaClient());
