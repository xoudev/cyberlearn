"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, challengeRepository } from "@cyberlearn/db";
import { dayKey, registerActivity } from "@cyberlearn/lib";
import { requireRequestUser } from "@/lib/auth";
import { recordQuestProgress } from "@/lib/quests/progress";
import { checkHintReveal } from "@/lib/rate-limit";
import { creditXp } from "@/lib/xp/credit";

// ── Start ──────────────────────────────────────────────────────────────────────

export async function startChallengeAction(challengeId: string): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(challengeId).success) return { error: "ID invalide." };
  const user = await requireRequestUser();

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId, isActive: true },
    select: { maxAttempts: true, prerequisiteId: true },
  });
  if (!challenge) return { error: "Challenge introuvable." };

  // Check prerequisite
  if (challenge.prerequisiteId) {
    const prereq = await challengeRepository.getUserProgress(user.id, challenge.prerequisiteId);
    if (prereq?.status !== "COMPLETED") return { error: "Prérequis non complété." };
  }

  const existing = await challengeRepository.getUserProgress(user.id, challengeId);
  if (existing?.status === "COMPLETED") return { error: "Déjà complété." };
  if (existing && existing.attempts >= challenge.maxAttempts)
    return { error: "Nombre maximum de tentatives atteint." };

  await challengeRepository.startChallenge(user.id, challengeId);
  revalidatePath("/challenges");
  return {};
}

// ── Submit flag (CTF) ──────────────────────────────────────────────────────────

export async function submitFlagAction(
  challengeId: string,
  submittedFlag: string,
): Promise<{ correct: boolean; error?: string }> {
  if (!z.string().uuid().safeParse(challengeId).success)
    return { correct: false, error: "ID invalide." };
  const flagParsed = z.string().trim().min(1).max(500).safeParse(submittedFlag);
  if (!flagParsed.success) return { correct: false, error: "Flag invalide." };

  const authUser = await requireRequestUser();

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId, isActive: true, type: { in: ["CTF", "SCRIPT"] } },
    select: { flag: true, xpReward: true, title: true, maxAttempts: true },
  });
  if (!challenge) return { correct: false, error: "Challenge introuvable." };
  if (!challenge.flag) return { correct: false, error: "Aucun flag configuré." };

  const existing = await challengeRepository.getUserProgress(authUser.id, challengeId);
  if (existing?.status === "COMPLETED") return { correct: true };

  const attempts = (existing?.attempts ?? 0) + 1;

  // Case-insensitive trim comparison
  const correct = flagParsed.data.toLowerCase() === challenge.flag.toLowerCase();

  if (!correct) {
    if (existing) {
      await prisma.userChallengeProgress.update({
        where: { userId_challengeId: { userId: authUser.id, challengeId } },
        data: { attempts },
      });
    } else {
      await challengeRepository.startChallenge(authUser.id, challengeId);
    }

    const remaining = challenge.maxAttempts - attempts;
    revalidatePath("/challenges");
    return {
      correct: false,
      error:
        remaining > 0
          ? `Flag incorrect. ${String(remaining)} tentative(s) restante(s).`
          : "Plus de tentatives disponibles.",
    };
  }

  // Correct: award XP and mark complete
  await awardChallengeXp(authUser.id, challengeId, challenge.xpReward, challenge.title);
  revalidatePath("/challenges");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { correct: true };
}

// ── Complete (PUZZLE / LAB: honor system) ──────────────────────────────────────

export async function completeChallengeAction(challengeId: string): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(challengeId).success) return { error: "ID invalide." };
  const authUser = await requireRequestUser();

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId, isActive: true },
    select: { type: true, xpReward: true, title: true },
  });
  if (!challenge) return { error: "Challenge introuvable." };
  if (challenge.type === "CTF" || challenge.type === "SCRIPT")
    return { error: "Utilise la soumission de flag." };

  const existing = await challengeRepository.getUserProgress(authUser.id, challengeId);
  if (existing?.status === "COMPLETED") return {};

  await awardChallengeXp(authUser.id, challengeId, challenge.xpReward, challenge.title);
  revalidatePath("/challenges");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return {};
}

// ── Reveal hint ───────────────────────────────────────────────────────────────

export async function revealHintAction(
  hintId: string,
): Promise<{ content?: string; error?: string }> {
  const user = await requireRequestUser();
  if (!z.string().uuid().safeParse(hintId).success) return { error: "ID invalide." };

  const hintLimit = await checkHintReveal(user.id);
  if (!hintLimit.success) {
    return { error: "Trop d'indices révélés. Réessayez plus tard." };
  }

  const hint = await prisma.challengeHint.findUnique({
    where: { id: hintId },
    select: { xpCost: true, content: true },
  });
  if (!hint) return { error: "Indice introuvable." };

  const alreadyRevealed = await prisma.challengeHintReveal.findUnique({
    where: { userId_hintId: { userId: user.id, hintId } },
    select: { id: true },
  });
  if (alreadyRevealed) return { content: hint.content };

  if (hint.xpCost > 0) {
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { xpTotal: true },
    });
    if (!userData) return { error: "Utilisateur introuvable." };
    if (userData.xpTotal < hint.xpCost) {
      return { error: `XP insuffisants (coût : ${String(hint.xpCost)} XP).` };
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { xpTotal: { decrement: hint.xpCost } },
      }),
      prisma.challengeHintReveal.create({ data: { userId: user.id, hintId } }),
    ]);
    revalidatePath("/challenges");
    revalidatePath("/dashboard");
    return { content: hint.content };
  }

  await prisma.challengeHintReveal.create({ data: { userId: user.id, hintId } });
  return { content: hint.content };
}

// ── Internal XP award ─────────────────────────────────────────────────────────

async function awardChallengeXp(
  userId: string,
  challengeId: string,
  xpReward: number,
  challengeTitle: string,
): Promise<void> {
  const [user] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        xpTotal: true,
        level: true,
        streakDays: true,
        longestStreak: true,
        streakFreezes: true,
        lastActiveAt: true,
      },
    }),
    challengeRepository.completeChallenge(userId, challengeId),
  ]);

  if (!user) return;

  const now = new Date();
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

  await prisma.$transaction(async (tx) => {
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
        body: `+${String(xpReward)} XP remportés !`,
        actionUrl: "/challenges",
        metadata: { xpReward, challengeId },
      },
    });
    // Single XP source of truth - emits the LEVEL_UP notification when crossed.
    await creditXp(tx, userId, xpReward, "CHALLENGE", {
      notifyXp: xpReward,
      metadata: { challengeId },
    });
  });

  // Weekly quests: a challenge completion keeps the streak quest moving too.
  await recordQuestProgress(userId, "STREAK_DAYS", now, { setTo: streak.currentStreak });
}
