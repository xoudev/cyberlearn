import { isInvalidRefreshTokenError } from "@/lib/auth-errors";
import { supabase } from "@/lib/supabase";

// Thin client for the web app's mobile API routes (apps/web/app/api/mobile/*).
// Overridable via EXPO_PUBLIC_SITE_URL for local dev against localhost:3000.
const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || "https://cyberlearn.fr";

function requestWithToken(path: string, token: string, init?: RequestInit): Promise<Response> {
  return fetch(`${SITE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

/** Authenticated fetch that refreshes and retries once after an expired JWT. */
async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Non authentifié");

  const response = await requestWithToken(path, token, init);
  if (response.status !== 401) return response;

  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error && isInvalidRefreshTokenError(error)) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
  const refreshedToken = refreshed.session?.access_token;
  if (error || !refreshedToken) throw new Error("Session expirée");

  return requestWithToken(path, refreshedToken, init);
}

function readActionResponse(value: unknown): { ok: boolean; error?: string } {
  if (typeof value !== "object" || value === null || !("ok" in value)) {
    return { ok: false, error: "Réponse serveur invalide." };
  }

  const ok = value.ok === true;
  const error = "error" in value && typeof value.error === "string" ? value.error : undefined;
  return error ? { ok, error } : { ok };
}

export async function updatePasswordApi(input: {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await authedFetch("/api/mobile/password", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return readActionResponse(await response.json());
  } catch {
    return { ok: false, error: "Connexion au serveur impossible." };
  }
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

// ── Leaderboard (leaderboard + league pod, anonymization applied server-side) ──

export interface LeaderboardEntry {
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

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  userRank: number;
  league: {
    division: string;
    pod: number;
    seasonEndsAt: string;
    ladder: PodEntry[];
  } | null;
}

export async function fetchLeaderboard(): Promise<LeaderboardData> {
  const res = await authedFetch("/api/mobile/leaderboard");
  const body = (await res.json()) as ({ ok: true } & LeaderboardData) | { ok: false };
  if (!body.ok) throw new Error("Chargement impossible");
  return { entries: body.entries, userRank: body.userRank, league: body.league };
}

// ── Locker (cosmetics loadout - guarded ownership check server-side) ──────────

export type CosmeticSlot = "TERMINAL_THEME" | "HEXAGON_STYLE" | "PROFILE_FRAME" | "ACCENT_COLOR";

export async function equipCosmetic(code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authedFetch("/api/mobile/loadout", {
      method: "POST",
      body: JSON.stringify({ action: "equip", code }),
    });
    return readActionResponse(await res.json());
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
    return readActionResponse(await res.json());
  } catch {
    return { ok: false, error: "Connexion au serveur impossible." };
  }
}
