import { supabase } from "@/lib/supabase";

// Thin client for the web app's mobile API routes (apps/web/app/api/mobile/*).
// Overridable via EXPO_PUBLIC_SITE_URL for local dev against localhost:3000.
// NB: use the www host - the apex 307-redirects and some fetch stacks drop the
// POST body when following it.
const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || "https://cyberlearn.fr";

interface SendOtpResponse {
  ok: boolean;
  error?: string;
}

/**
 * Ask the server to email a 6-digit login code. Goes through the web app (not
 * supabase.auth.signInWithOtp) because Supabase's built-in email only carries a
 * magic link; the server flow sends our Resend template which includes the code.
 */
export async function requestLoginCode(email: string): Promise<SendOtpResponse> {
  try {
    const res = await fetch(`${SITE_URL}/api/mobile/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = (await res.json()) as SendOtpResponse;
    return { ok: body.ok === true, ...(body.error ? { error: body.error } : {}) };
  } catch {
    return { ok: false, error: "Connexion au serveur impossible." };
  }
}

/** Authenticated fetch against the mobile API (Supabase access token as Bearer). */
async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Non authentifié");
  return fetch(`${SITE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

// ── Lesson completion (guarded server flow: XP, streak, badges, quests) ───────

export interface CompleteLessonResult {
  alreadyCompleted: boolean;
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  newBadges: { name: string; rarity: string; xpReward: number }[];
}

export async function completeLessonApi(lessonId: string): Promise<CompleteLessonResult | null> {
  try {
    const res = await authedFetch("/api/mobile/progress", {
      method: "POST",
      body: JSON.stringify({ lessonId }),
    });
    const body = (await res.json()) as { ok: boolean; result?: CompleteLessonResult };
    return body.ok && body.result ? body.result : null;
  } catch {
    return null;
  }
}

// ── Classement (leaderboard + league pod, anonymization applied server-side) ──

export interface ClassementEntry {
  rank: number;
  isCurrentUser: boolean;
  displayName: string | null;
  username: string | null;
  level: number;
  xpTotal: number;
  streakDays: number;
}

export interface PodEntry {
  rank: number;
  isCurrentUser: boolean;
  displayName: string | null;
  username: string | null;
  level: number;
  seasonXp: number;
  promotion: boolean;
  relegation: boolean;
}

export interface ClassementData {
  entries: ClassementEntry[];
  userRank: number;
  league: {
    division: string;
    pod: number;
    seasonEndsAt: string;
    ladder: PodEntry[];
  } | null;
}

export async function fetchClassement(): Promise<ClassementData> {
  const res = await authedFetch("/api/mobile/classement");
  const body = (await res.json()) as ({ ok: true } & ClassementData) | { ok: false };
  if (!body.ok) throw new Error("Chargement impossible");
  return { entries: body.entries, userRank: body.userRank, league: body.league };
}

// ── Casier (cosmetics loadout - guarded ownership check server-side) ──────────

export type CosmeticSlot = "TERMINAL_THEME" | "HEXAGON_STYLE" | "PROFILE_FRAME" | "ACCENT_COLOR";

export async function equipCosmetic(code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authedFetch("/api/mobile/loadout", {
      method: "POST",
      body: JSON.stringify({ action: "equip", code }),
    });
    return (await res.json()) as { ok: boolean; error?: string };
  } catch {
    return { ok: false, error: "Connexion au serveur impossible." };
  }
}

export async function unequipCosmetic(
  type: CosmeticSlot,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authedFetch("/api/mobile/loadout", {
      method: "POST",
      body: JSON.stringify({ action: "unequip", type }),
    });
    return (await res.json()) as { ok: boolean; error?: string };
  } catch {
    return { ok: false, error: "Connexion au serveur impossible." };
  }
}
