/**
 * Playing a challenge, for whoever asks: the site's Server Actions
 * (app/(app)/challenges/_actions) and the app's routes (api/mobile/challenges)
 * call the same functions, so a flag, a hint or an XP award cannot work one
 * way on the site and another in the app. The caller has checked who the
 * learner is; the inputs are checked here.
 */

import { z } from "zod";
import { prisma, challengeRepository } from "@cyberlearn/db";
import { dayKey, registerActivity } from "@cyberlearn/lib";
import { challengeXp, weeklyChallengeId } from "@cyberlearn/lib/challenges/weekly";
import { flagsMatch, personalFlag } from "@/lib/challenges/flag";
import { env } from "@/lib/env";
import { recordQuestProgress } from "@/lib/quests/progress";
import { checkHintReveal } from "@/lib/rate-limit";
import { creditXp } from "@/lib/xp/credit";

// ── Submit flag (CTF) ──────────────────────────────────────────────────────────

/**
 * The flag a learner must find. On a Linux machine it is their own (see
 * lib/challenges/flag.ts), and without the key to compute it the challenge is
 * unavailable rather than open to a flag anyone could work out; otherwise it is
 * the one the author wrote. A tournament checks its flags with it too
 * (lib/tournaments), so a flag is right or wrong the same way everywhere.
 */
export function expectedFlag(
  challenge: { id: string; flag: string | null; machine: unknown },
  userId: string,
): { ok: true; flag: string } | { ok: false; error: string } {
  if (challenge.machine !== null) {
    const secret = env.CHALLENGE_FLAG_SECRET;
    if (secret === undefined)
      return { ok: false, error: "Ce défi est indisponible pour le moment." };
    return { ok: true, flag: personalFlag(secret, challenge.id, userId) };
  }
  if (!challenge.flag) return { ok: false, error: "Aucun flag configuré." };
  return { ok: true, flag: challenge.flag };
}

export async function submitFlagFor(
  userId: string,
  challengeId: string,
  submittedFlag: string,
): Promise<{ correct: boolean; error?: string; xpEarned?: number }> {
  if (!z.guid().safeParse(challengeId).success) return { correct: false, error: "ID invalide." };
  const flagParsed = z.string().trim().min(1).max(500).safeParse(submittedFlag);
  if (!flagParsed.success) return { correct: false, error: "Flag invalide." };

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId, isActive: true, type: { in: ["CTF", "SCRIPT"] } },
    select: { id: true, flag: true, machine: true, xpReward: true, title: true, maxAttempts: true },
  });
  if (!challenge) return { correct: false, error: "Challenge introuvable." };
  const expected = expectedFlag(challenge, userId);
  if (!expected.ok) return { correct: false, error: expected.error };

  const existing = await challengeRepository.getUserProgress(userId, challengeId);
  if (existing?.status === "COMPLETED") return { correct: true };
  // The last attempt was the last: an answer past it is not looked at, right
  // or wrong. It used to be, so the limit only changed the message.
  if (existing && existing.attempts >= challenge.maxAttempts) {
    return { correct: false, error: "Plus de tentatives disponibles." };
  }

  const attempts = (existing?.attempts ?? 0) + 1;
  const correct = flagsMatch(flagParsed.data, expected.flag);

  if (!correct) {
    if (existing) {
      await prisma.userChallengeProgress.update({
        where: { userId_challengeId: { userId, challengeId } },
        data: { attempts },
      });
    } else {
      await challengeRepository.startChallenge(userId, challengeId);
    }

    const remaining = challenge.maxAttempts - attempts;
    return {
      correct: false,
      error:
        remaining > 0
          ? `Flag incorrect. ${String(remaining)} tentative(s) restante(s).`
          : "Plus de tentatives disponibles.",
    };
  }

  // Correct: award XP and mark complete
  const xpEarned = await awardChallengeXp(userId, challengeId, challenge.xpReward, challenge.title);
  return xpEarned === null ? { correct: true } : { correct: true, xpEarned };
}

// ── Complete (PUZZLE / LAB: honor system) ──────────────────────────────────────

export async function completeFor(
  userId: string,
  challengeId: string,
): Promise<{ error?: string; xpEarned?: number }> {
  if (!z.guid().safeParse(challengeId).success) return { error: "ID invalide." };

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId, isActive: true },
    select: { type: true, xpReward: true, title: true },
  });
  if (!challenge) return { error: "Challenge introuvable." };
  if (challenge.type === "CTF" || challenge.type === "SCRIPT")
    return { error: "Utilise la soumission de flag." };

  const existing = await challengeRepository.getUserProgress(userId, challengeId);
  if (existing?.status === "COMPLETED") return {};

  const xpEarned = await awardChallengeXp(userId, challengeId, challenge.xpReward, challenge.title);
  return xpEarned === null ? {} : { xpEarned };
}

// ── Reveal hint ───────────────────────────────────────────────────────────────

export async function revealHintFor(
  userId: string,
  hintId: string,
): Promise<{ content?: string; error?: string }> {
  if (!z.guid().safeParse(hintId).success) return { error: "ID invalide." };

  const hintLimit = await checkHintReveal(userId);
  if (!hintLimit.success) {
    return { error: "Trop d'indices révélés. Réessayez plus tard." };
  }

  const hint = await prisma.challengeHint.findUnique({
    where: { id: hintId },
    select: { xpCost: true, content: true },
  });
  if (!hint) return { error: "Indice introuvable." };

  const alreadyRevealed = await prisma.challengeHintReveal.findUnique({
    where: { userId_hintId: { userId, hintId } },
    select: { id: true },
  });
  if (alreadyRevealed) return { content: hint.content };

  if (hint.xpCost > 0) {
    // Atomic conditional spend: decrement only while the balance still covers the
    // cost, so concurrent reveals can't drive xpTotal negative. The reveal is
    // bound to the successful spend in one transaction.
    const revealed = await prisma.$transaction(async (tx) => {
      const spend = await tx.user.updateMany({
        where: { id: userId, xpTotal: { gte: hint.xpCost } },
        data: { xpTotal: { decrement: hint.xpCost } },
      });
      if (spend.count === 0) return false;
      await tx.challengeHintReveal.create({ data: { userId, hintId } });
      return true;
    });
    if (!revealed) {
      return { error: `XP insuffisants (coût : ${String(hint.xpCost)} XP).` };
    }
    return { content: hint.content };
  }

  await prisma.challengeHintReveal.create({ data: { userId, hintId } });
  return { content: hint.content };
}

// ── Internal XP award ─────────────────────────────────────────────────────────

/**
 * Marks the challenge solved and credits its XP, once: twice the reward when
 * it is the challenge of the week (@cyberlearn/lib/challenges/weekly), the
 * one the page names, since both read the catalogue in the same order.
 * Returns the XP credited, or null when nothing was (already solved, or no
 * such learner).
 */
async function awardChallengeXp(
  userId: string,
  challengeId: string,
  xpReward: number,
  challengeTitle: string,
): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      xpTotal: true,
      level: true,
      streakDays: true,
      longestStreak: true,
      streakFreezes: true,
      lastActiveAt: true,
    },
  });

  if (!user) return null;

  const now = new Date();
  const weekly =
    weeklyChallengeId(await challengeRepository.findActiveIdsInOrder(), now) === challengeId;
  const amount = challengeXp(xpReward, weekly);
  const streak = registerActivity(
    {
      currentStreak: user.streakDays,
      longestStreak: user.longestStreak,
      lastActiveDay: dayKey(user.lastActiveAt),
      freezes: user.streakFreezes,
    },
    now,
  ).state;
  const today = new Date(dayKey(now));

  const credited = await prisma.$transaction(async (tx) => {
    // Ensure a progress row exists, then atomically flip it to COMPLETED only if
    // it is not already. The transaction that wins this flip is the ONLY one that
    // credits XP / streak / notification - idempotent against a double submit or
    // double click (the earlier non-transactional status check was not a real
    // gate, so two concurrent correct submissions both credited).
    await tx.userChallengeProgress.upsert({
      where: { userId_challengeId: { userId, challengeId } },
      create: { userId, challengeId, status: "IN_PROGRESS", attempts: 1 },
      update: {},
    });
    const completed = await tx.userChallengeProgress.updateMany({
      where: { userId, challengeId, status: { not: "COMPLETED" } },
      data: { status: "COMPLETED", completedAt: now, xpEarned: amount },
    });
    if (completed.count === 0) return false;

    await tx.user.update({
      where: { id: userId },
      data: {
        streakDays: streak.currentStreak,
        longestStreak: streak.longestStreak,
        streakFreezes: streak.freezes,
        lastActiveAt: now,
      },
    });
    await tx.userActivityDay.upsert({
      where: { userId_day: { userId, day: today } },
      create: { userId, day: today, count: 1 },
      update: { count: { increment: 1 } },
    });
    await tx.notification.create({
      data: {
        userId,
        type: "BADGE_EARNED",
        title: `Challenge complété : ${challengeTitle}`,
        body: weekly
          ? `+${String(amount)} XP remportés, le double : c'était le défi de la semaine !`
          : `+${String(amount)} XP remportés !`,
        actionUrl: "/challenges",
        metadata: { xpReward: amount, challengeId, weekly },
      },
    });
    // Single XP source of truth - emits the LEVEL_UP notification when crossed.
    await creditXp(tx, userId, amount, "CHALLENGE", {
      notifyXp: amount,
      metadata: { challengeId },
    });
    return true;
  });
  if (!credited) return null;

  // Weekly quests: a challenge completion keeps the streak quest moving too.
  await recordQuestProgress(userId, "STREAK_DAYS", now, { setTo: streak.currentStreak });
  return amount;
}
