import { LIVE_CLASS_FILTER, prisma } from "@cyberlearn/db";
import { DEFAULT_TOURNAMENT_POINTS } from "@cyberlearn/lib/challenges/tournament";
import type { ChallengeOption, ClassOption } from "./tournament-form";

/**
 * What a tournament can be made of, for the form: the live classes, by school,
 * and the challenges that take a flag, with what each is worth by default.
 */
export async function tournamentOptions(): Promise<{
  classes: ClassOption[];
  challenges: ChallengeOption[];
}> {
  const [classes, challenges] = await Promise.all([
    prisma.class.findMany({
      where: LIVE_CLASS_FILTER,
      orderBy: [{ promotion: { establishment: { name: "asc" } } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        promotion: { select: { name: true, establishment: { select: { name: true } } } },
      },
    }),
    prisma.challenge.findMany({
      where: { type: { in: ["CTF", "SCRIPT"] } },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        refCode: true,
        type: true,
        difficulty: true,
        isActive: true,
      },
    }),
  ]);
  return {
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      school: c.promotion.establishment.name,
      promotion: c.promotion.name,
    })),
    challenges: challenges.map((c) => ({
      id: c.id,
      title: c.title,
      refCode: c.refCode,
      type: c.type,
      isActive: c.isActive,
      defaultPoints: DEFAULT_TOURNAMENT_POINTS[c.difficulty],
    })),
  };
}
