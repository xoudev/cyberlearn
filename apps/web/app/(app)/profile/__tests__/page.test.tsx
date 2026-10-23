import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BadgeCollection } from "@/lib/badges/collection";

const m = vi.hoisted(() => ({
  requireRequestUser: vi.fn<() => Promise<{ id: string }>>(),
  findProfile: vi.fn<(userId: string) => Promise<unknown>>(),
  listForUser: vi.fn<(userId: string) => Promise<unknown[]>>(),
  findForMember: vi.fn<(userId: string) => Promise<unknown[]>>(),
  buildBadgeCollection: vi.fn<(userId: string) => Promise<unknown>>(),
}));

vi.mock("@/lib/auth", () => ({ requireRequestUser: m.requireRequestUser }));
vi.mock("@cyberlearn/db", () => ({
  userRepository: { findProfile: m.findProfile },
  certificateRepository: { listForUser: m.listForUser },
  classRepository: { findForMember: m.findForMember },
}));
vi.mock("@/lib/badges/collection", () => ({ buildBadgeCollection: m.buildBadgeCollection }));
vi.mock("@/lib/avatar/storage", () => ({
  resolveAvatarSrc: (src: string | null) => Promise.resolve(src),
}));

const { default: ProfilePage } = await import("../page");

/**
 * The profile reads the badge collection for its Badges tab. Building it
 * awards the badges earned but never given, and credits their XP: the
 * profile has to be read after it, or the XP, the level and the badge count
 * of the page would be those from before the award, beside a tab that
 * already counts the new badge.
 */

const COLLECTION: BadgeCollection = {
  groups: [],
  earnedCount: 1,
  totalCount: 3,
  rarityTotals: { COMMON: 3 },
  rarityEarned: { COMMON: 1 },
};

const PROFILE = {
  username: "ada",
  displayName: "Ada",
  avatarUrl: null,
  bio: null,
  xpTotal: 150,
  streakDays: 2,
  createdAt: new Date("2026-01-15T00:00:00Z"),
  preferences: null,
  badges: [{ badge: { rarity: "COMMON" } }],
  lessonProgress: [],
  counts: { lessons: 0 },
};

/**
 * Every prop bag in a rendered element tree, to find the one a component was
 * given. Descends into plain objects too: the tabs' panels are an object of
 * elements.
 */
function collectProps(
  node: unknown,
  out: Record<string, unknown>[] = [],
): Record<string, unknown>[] {
  if (Array.isArray(node)) {
    for (const child of node) collectProps(child, out);
  } else if (typeof node === "object" && node !== null && !(node instanceof Date)) {
    // An element has `props`; the shape is checked before the cast is relied on.
    const props = (node as { props?: unknown }).props;
    if (typeof props === "object" && props !== null) {
      // Cast: `props` was narrowed to a non-null object just above, keys unknown.
      out.push(props as Record<string, unknown>);
      for (const value of Object.values(props)) collectProps(value, out);
    } else {
      for (const value of Object.values(node)) collectProps(value, out);
    }
  }
  return out;
}

/** Lets every pending promise callback run. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireRequestUser.mockResolvedValue({ id: "u1" });
  m.findProfile.mockResolvedValue(PROFILE);
  m.listForUser.mockResolvedValue([]);
  m.findForMember.mockResolvedValue([]);
  m.buildBadgeCollection.mockResolvedValue(COLLECTION);
});

describe("the profile page", () => {
  it("reads the profile once the badge collection, and its catch-up awards, are done", async () => {
    let finish: (collection: BadgeCollection) => void = () => undefined;
    m.buildBadgeCollection.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );

    const page = ProfilePage();
    await settle();

    // The certificates and the classes do not wait for the collection.
    expect(m.buildBadgeCollection).toHaveBeenCalledWith("u1");
    expect(m.listForUser).toHaveBeenCalledWith("u1");
    expect(m.findForMember).toHaveBeenCalledWith("u1");
    expect(m.findProfile).not.toHaveBeenCalled();

    finish(COLLECTION);
    await page;
    expect(m.findProfile).toHaveBeenCalledWith("u1");
  });

  it("counts the lessons completed from the repository, not from the twenty it lists", async () => {
    // Thirty-five lessons completed; the repository lists the twenty latest.
    m.findProfile.mockResolvedValue({
      ...PROFILE,
      counts: { lessons: 35 },
      lessonProgress: Array.from({ length: 20 }, (_, i) => ({
        lessonId: `l${String(i)}`,
        completedAt: new Date("2026-10-01T10:00:00Z"),
        lesson: {
          title: `Leçon ${String(i)}`,
          slug: `l${String(i)}`,
          category: "DEV",
          xpReward: 10,
        },
      })),
    });

    const tree = await ProfilePage();
    const props = collectProps(tree);

    // The Activité tab's counter and the "Leçons terminées" tile.
    const tabs = props.find((bag) => "counts" in bag && "panels" in bag);
    expect(tabs?.counts).toMatchObject({ activite: 35 });
    const tile = props.find((bag) => bag.label === "Leçons");
    expect(JSON.stringify(collectProps(tile?.children).map((bag) => bag.children))).toContain("35");
    // The list says it stops short.
    const feed = props.find((bag) => "lessons" in bag && "total" in bag);
    expect(feed?.total).toBe(35);
    expect(feed?.lessons).toHaveLength(20);
  });
});
