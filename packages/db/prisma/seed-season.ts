/**
 * Starts the league: creates the first ACTIVE season (or the next one) when none
 * is active. Run once to kick the league off; the rollover job opens later
 * seasons automatically.
 *
 *   pnpm --filter @cyberlearn/db db:seed-season          (DRY RUN)
 *   pnpm --filter @cyberlearn/db db:seed-season --apply  (create)
 *
 * Idempotent: does nothing if a season is already ACTIVE.
 */

import { PrismaClient } from "@prisma/client";

const apply = process.argv.includes("--apply");
const SEASON_DAYS = 7;

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const active = await prisma.season.findFirst({ where: { status: "ACTIVE" } });
    if (active) {
      console.log(`Saison active déjà présente (index ${String(active.index)}). Rien à faire.`);
      return;
    }
    const last = await prisma.season.findFirst({
      orderBy: { index: "desc" },
      select: { index: true },
    });
    const index = (last?.index ?? 0) + 1;
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + SEASON_DAYS * 24 * 60 * 60 * 1000);

    console.log(apply ? "== APPLY MODE ==" : "== DRY RUN (passez --apply pour créer) ==");
    if (!apply) {
      console.log(`Créerait la saison ${String(index)} (active, ${String(SEASON_DAYS)} jours).`);
      return;
    }
    await prisma.season.create({ data: { index, startsAt, endsAt, status: "ACTIVE" } });
    console.log(`Saison ${String(index)} créée (active, fin dans ${String(SEASON_DAYS)} jours).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
