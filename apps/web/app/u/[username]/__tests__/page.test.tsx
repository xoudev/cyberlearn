import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The profile page itself: whose actions it offers to whom, and whose look
 * it wears. The data, the session and the friendship are stubbed; who may
 * open a private profile is the repository's rule (findPublicProfile).
 */

const db = vi.hoisted(() => ({
  userRepository: { findPublicProfile: vi.fn() },
  friendshipRepository: { between: vi.fn() },
  cosmeticRepository: { findLoadout: vi.fn() },
}));
vi.mock("@cyberlearn/db", () => db);

const auth = vi.hoisted(() => ({ getRequestUser: vi.fn<() => Promise<{ id: string } | null>>() }));
vi.mock("@/lib/auth", () => auth);

vi.mock("@/lib/avatar/storage", () => ({
  resolveAvatarSrc: (stored: string | null) => Promise.resolve(stored),
}));

vi.mock("@/app/(app)/_actions/friend-actions", () => ({
  sendFriendRequestAction: vi.fn(),
  removeFriendAction: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const { default: PublicProfilePage } = await import("../page");

const OWNER = "11111111-1111-4111-8111-111111111111";
const READER = "22222222-2222-4222-8222-222222222222";

const EMPTY_LOADOUT = {
  accentColor: null,
  hexagonStyle: null,
  profileFrame: null,
  terminalTheme: null,
};

function profile(overrides: { publicProfile?: boolean } = {}): Record<string, unknown> {
  return {
    id: OWNER,
    username: "alex",
    displayName: "Alex",
    bio: "J'apprends le réseau.",
    avatarUrl: null,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    xpTotal: 1200,
    streakDays: 3,
    preferences: { publicProfile: overrides.publicProfile ?? true },
    badges: [],
    lessonProgress: [],
    pathProgress: [],
    certificates: [],
    challengeProgress: [],
    lessonsByCategory: [],
  };
}

async function render(): Promise<string> {
  return renderToStaticMarkup(
    await PublicProfilePage({ params: Promise.resolve({ username: "alex" }) }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  db.userRepository.findPublicProfile.mockResolvedValue(profile());
  db.friendshipRepository.between.mockResolvedValue(null);
  db.cosmeticRepository.findLoadout.mockResolvedValue(EMPTY_LOADOUT);
});

describe("the public profile page", () => {
  it("follows the page conventions: the breadcrumb, the eyebrow, the title", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    const html = await render();

    expect(html).toContain('class="page-container"');
    expect(html).toContain("pg-crumb");
    expect(html).toContain('<p class="pg-eyebrow">Profil public · membre depuis');
    expect(html).toContain('<h1 class="pg-title pp-title"><em>Alex</em>.</h1>');
    expect(html).toContain('<p class="pg-lede pp-lede">J&#x27;apprends le réseau.</p>');
  });

  it("says a private profile is one, to the friend it opened to", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    db.userRepository.findPublicProfile.mockResolvedValue(profile({ publicProfile: false }));
    db.friendshipRepository.between.mockResolvedValue({
      status: "ACCEPTED",
      requestedById: OWNER,
    });
    const html = await render();

    expect(html).toContain("Profil privé, visible par ses amis");
  });

  it("offers nothing to do to a reader signed out", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    const html = await render();

    expect(html).not.toContain("Ajouter en ami");
    expect(html).not.toContain("Modifier mon profil");
    expect(html).not.toContain("Copier le lien");
    expect(db.friendshipRepository.between).not.toHaveBeenCalled();
  });

  it("offers the owner their settings and their link, and no friendship with themselves", async () => {
    auth.getRequestUser.mockResolvedValue({ id: OWNER });
    const html = await render();

    expect(html).toMatch(/<a[^>]*href="\/settings\/profile"[^>]*>Modifier mon profil<\/a>/);
    expect(html).toContain(">Copier le lien<");
    expect(html).not.toContain("Ajouter en ami");
    expect(html).not.toContain("Défier en duel");
    expect(db.friendshipRepository.between).not.toHaveBeenCalled();
  });

  it("shows a friend the friendship and the duel, and not the owner's links", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    db.friendshipRepository.between.mockResolvedValue({
      status: "ACCEPTED",
      requestedById: READER,
    });
    const html = await render();

    expect(html).toContain(">Ami ✓<");
    expect(html).toContain(`href="/duels?ami=${OWNER}"`);
    expect(html).not.toContain("Retirer des amis");
    expect(html).not.toContain("Modifier mon profil");
    expect(html).not.toContain("Copier le lien");
  });

  it("lets a reader answer the owner's request either way", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    db.friendshipRepository.between.mockResolvedValue({
      status: "PENDING",
      requestedById: OWNER,
    });
    const html = await render();

    expect(html).toContain(">Accepter<");
    expect(html).toContain(">Refuser<");
    expect(html).not.toContain("Défier en duel");
  });

  it("wears the owner's cosmetics in its own scope, every slot stated", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    db.cosmeticRepository.findLoadout.mockResolvedValue({
      ...EMPTY_LOADOUT,
      accentColor: "accent-violet",
    });
    const html = await render();

    expect(db.cosmeticRepository.findLoadout).toHaveBeenCalledWith(OWNER);
    expect(html).toMatch(
      /<div class="pp-owner" data-accent="accent-violet" data-hex="hex-solid" data-frame="frame-standard" data-terminal="theme-midnight-ops">/,
    );
  });

  it("falls back to the default look when the owner's cosmetics cannot be read", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    db.cosmeticRepository.findLoadout.mockRejectedValue(new Error("db down"));
    const html = await render();

    expect(html).toContain('data-accent="accent-turquoise"');
  });

  it("answers a profile it may not open with the 404", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    db.userRepository.findPublicProfile.mockResolvedValue(null);

    await expect(render()).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });
});
