import { onboardingRepository, type FirstDays, type OnboardingRecipient } from "@cyberlearn/db";
import { sendFirstWeekEmail, type FirstWeekStep } from "@cyberlearn/email";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { env } from "@/lib/env";
import { nextLessonFor } from "./next-lesson";

/**
 * The first week after sign-up, in three e-mails, sent by the daily cron
 * (/api/cron/onboarding-emails):
 *
 * - day 1, only to whoever has not finished a lesson yet;
 * - day 3, only to whoever has finished nothing for two days;
 * - day 7, to everyone, the week told back.
 *
 * A learner already at work is left alone: a step that is not needed is
 * handled all the same, and never comes back. Each step goes to an account
 * once (onboarding_emails), only while it keeps e-mails on, and never to an
 * account banned.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** When each step is due, in days after sign-up. */
export const FIRST_WEEK_SCHEDULE: readonly { step: FirstWeekStep; afterDays: number }[] = [
  { step: "FIRST_MISSION", afterDays: 1 },
  { step: "COME_BACK", afterDays: 3 },
  { step: "FIRST_WEEK", afterDays: 7 },
];

/**
 * How long an account stays due for a step, in days: two runs of the cron,
 * the second for an e-mail that could not go on the first.
 */
export const STEP_WINDOW_DAYS = 2;

/** The accounts' sign-up window for a step, as of `now`. */
export function stepWindow(afterDays: number, now: Date): { from: Date; to: Date } {
  return {
    from: new Date(now.getTime() - (afterDays + STEP_WINDOW_DAYS) * DAY_MS),
    to: new Date(now.getTime() - afterDays * DAY_MS),
  };
}

/** Whether a step has something to say to this learner, as of `now`. */
export function stepIsNeeded(step: FirstWeekStep, days: FirstDays, now: Date): boolean {
  switch (step) {
    case "FIRST_MISSION":
      return days.lessonsCompleted === 0;
    case "COME_BACK":
      return (
        days.lastCompletedAt === null ||
        now.getTime() - days.lastCompletedAt.getTime() >= 2 * DAY_MS
      );
    case "FIRST_WEEK":
      return true;
  }
}

export interface FirstWeekSummary {
  sent: number;
  /** Claimed and found not needed: a learner already at work. */
  skipped: number;
  failed: number;
}

async function handle(
  step: FirstWeekStep,
  account: OnboardingRecipient,
  now: Date,
  summary: FirstWeekSummary,
): Promise<void> {
  if (!(await onboardingRepository.claim(account.id, step, now))) return;
  try {
    const days = await onboardingRepository.firstDays(account.id);
    if (!stepIsNeeded(step, days, now)) {
      summary.skipped++;
      return;
    }
    const lesson = await nextLessonFor(account.id, days.xpTotal);
    const site = env.NEXT_PUBLIC_SITE_URL;
    await sendFirstWeekEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL,
      to: account.email,
      step,
      displayName: account.displayName,
      lesson:
        lesson === null
          ? null
          : {
              title: lesson.title,
              minutes: lesson.estimatedMinutes,
              xp: lesson.xpReward,
              url: `${site}/lessons/${lesson.slug}`,
            },
      ...(step === "FIRST_WEEK"
        ? {
            tally: {
              lessons: days.lessonsCompleted,
              xp: days.xpTotal,
              streakDays: days.streakDays,
            },
          }
        : {}),
      siteUrl: site,
    });
    summary.sent++;
  } catch (err) {
    // Not marked: the next run, still inside the window, tries again.
    summary.failed++;
    await onboardingRepository.release(account.id, step).catch(() => undefined);
    logger.error(
      { scope: "onboarding-emails", step, userId: account.id, err: errorMessage(err) },
      "first-week e-mail failed",
    );
  }
}

/** One run: every step, every account due for it. One account's failure stops nobody else's. */
export async function runFirstWeek(now: Date): Promise<FirstWeekSummary> {
  const summary: FirstWeekSummary = { sent: 0, skipped: 0, failed: 0 };
  for (const { step, afterDays } of FIRST_WEEK_SCHEDULE) {
    const { from, to } = stepWindow(afterDays, now);
    const due = await onboardingRepository.dueForStep(step, from, to, now);
    for (const account of due) await handle(step, account, now, summary);
  }
  return summary;
}
