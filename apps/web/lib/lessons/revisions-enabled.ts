import { prisma } from "@cyberlearn/db";

/**
 * Whether spaced repetition is on for this account.
 *
 * One question, asked from the five places that have to agree about it: the
 * sidebar entry, the dashboard section, the page itself, the scheduler that
 * feeds the queue, and the cron that mails about it. Spelling the condition out
 * at each of them is how they come to disagree - and the way that failure shows
 * up is a switch that appears to do nothing.
 *
 * Absent preferences means pre-onboarding, and the column defaults to true: an
 * account that has never expressed a choice is treated as having made none.
 */
export async function revisionsEnabled(userId: string): Promise<boolean> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: { spacedRepetition: true },
  });
  return prefs?.spacedRepetition !== false;
}
