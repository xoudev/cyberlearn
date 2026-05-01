import { PrismaClient } from "@prisma/client";

// Singleton pattern to avoid multiple Prisma Client instances in development
// (Next.js hot reload creates new module instances repeatedly)
declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: ["warn", "error"],
  });
}

export const prisma: PrismaClient = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
