import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  checkQaSubmission: vi.fn<(userId: string) => Promise<{ success: boolean }>>(),
  findChallenge: vi.fn<(args: unknown) => Promise<{ slug: string } | null>>(),
  hasSolved: vi.fn<(userId: string, challengeId: string) => Promise<boolean>>(),
  countVisible: vi.fn<(challengeId: string) => Promise<number>>(),
  findOwn: vi.fn<(userId: string, challengeId: string) => Promise<unknown>>(),
  listOthers: vi.fn<(challengeId: string, viewerId: string) => Promise<unknown[]>>(),
  upsert: vi.fn<(input: unknown) => Promise<{ id: string }>>(),
  deleteOwn: vi.fn<(userId: string, challengeId: string) => Promise<number>>(),
  screen:
    vi.fn<
      (input: unknown) => Promise<{ flagged: boolean; throttled: boolean; eventId: string | null }>
    >(),
  attachContent: vi.fn<(eventId: string, id: string) => Promise<void>>(),
  announceModeration: vi.fn<(input: unknown) => Promise<void>>(),
  revalidatePath: vi.fn<(path: string) => void>(),
}));

vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@cyberlearn/db", () => ({
  MODERATION_SURFACE: { challengeWriteup: "challenge.writeup" },
  prisma: { challenge: { findFirst: m.findChallenge } },
  moderationRepository: { screen: m.screen, attachContent: m.attachContent },
  writeupRepository: {
    hasSolved: m.hasSolved,
    countVisible: m.countVisible,
    findOwn: m.findOwn,
    listOthers: m.listOthers,
    upsert: m.upsert,
    deleteOwn: m.deleteOwn,
  },
}));
vi.mock("@cyberlearn/lib", () => ({
  FLAG_BUDGET_MESSAGE: "Trop de messages signalés.",
  excerpt: (text: string) => text,
}));
vi.mock("@/lib/rate-limit", () => ({ checkQaSubmission: m.checkQaSubmission }));
vi.mock("@/lib/moderation/announce", () => ({ announceModeration: m.announceModeration }));

const { deleteWriteup, publishWriteup, writeupBoardFor } = await import("../writeups");

const CHALLENGE = "11111111-1111-4111-8111-111111111111";
const SOLUTION =
  "J'ai lu les journaux avec grep, puis compté les adresses avec sort et uniq -c : la plus bavarde était la bonne.";

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.checkQaSubmission.mockResolvedValue({ success: true });
  m.findChallenge.mockResolvedValue({ slug: "premier-flag" });
  m.hasSolved.mockResolvedValue(true);
  m.countVisible.mockResolvedValue(3);
  m.screen.mockResolvedValue({ flagged: false, throttled: false, eventId: null });
  m.upsert.mockResolvedValue({ id: "w-1" });
});

describe("writeupBoardFor", () => {
  it("shows only the count to a reader who has not solved the challenge", async () => {
    m.hasSolved.mockResolvedValue(false);
    expect(await writeupBoardFor("u1", CHALLENGE)).toEqual({ solved: false, count: 3 });
    expect(m.findOwn).not.toHaveBeenCalled();
    expect(m.listOthers).not.toHaveBeenCalled();
  });

  it("opens the others' solutions once it is solved, an erased author left nameless", async () => {
    const at = new Date("2026-10-01T10:00:00Z");
    m.findOwn.mockResolvedValue({ content: "Ma solution.", isHidden: true, updatedAt: at });
    m.listOthers.mockResolvedValue([
      {
        id: "w-2",
        content: "Avec awk.",
        updatedAt: at,
        user: { displayName: "", username: "alex" },
      },
      { id: "w-3", content: "Avec cut.", updatedAt: at, user: null },
    ]);
    expect(await writeupBoardFor("u1", CHALLENGE)).toEqual({
      solved: true,
      count: 3,
      own: { content: "Ma solution.", isHidden: true, updatedAt: "2026-10-01T10:00:00.000Z" },
      others: [
        {
          id: "w-2",
          content: "Avec awk.",
          author: { name: "alex", username: "alex" },
          updatedAt: "2026-10-01T10:00:00.000Z",
        },
        { id: "w-3", content: "Avec cut.", author: null, updatedAt: "2026-10-01T10:00:00.000Z" },
      ],
    });
    expect(m.listOthers).toHaveBeenCalledWith(CHALLENGE, "u1");
  });

  it("is null for a challenge that is not there", async () => {
    expect(await writeupBoardFor("u1", "pas-un-id")).toBeNull();
    m.findChallenge.mockResolvedValue(null);
    expect(await writeupBoardFor("u1", CHALLENGE)).toBeNull();
  });
});

describe("publishWriteup", () => {
  it("publishes a solution once the challenge is solved, screened with links allowed", async () => {
    expect(
      await publishWriteup("u1", { challengeId: CHALLENGE, content: ` ${SOLUTION} ` }),
    ).toEqual({ ok: true });
    expect(m.screen).toHaveBeenCalledWith({
      text: SOLUTION,
      surface: "challenge.writeup",
      userId: "u1",
      allowLinks: true,
    });
    expect(m.upsert).toHaveBeenCalledWith({
      challengeId: CHALLENGE,
      userId: "u1",
      content: SOLUTION,
      isHidden: false,
    });
    expect(m.revalidatePath).toHaveBeenCalledWith("/challenges/premier-flag");
    expect(m.announceModeration).not.toHaveBeenCalled();
  });

  it("refuses a reader who has not solved it, before screening anything", async () => {
    m.hasSolved.mockResolvedValue(false);
    expect(await publishWriteup("u1", { challengeId: CHALLENGE, content: SOLUTION })).toEqual({
      ok: false,
      error: "Résous le défi avant de publier ta solution.",
    });
    expect(m.screen).not.toHaveBeenCalled();
    expect(m.upsert).not.toHaveBeenCalled();
  });

  it("holds a flagged solution for review, tied to its event and announced", async () => {
    m.screen.mockResolvedValue({ flagged: true, throttled: false, eventId: "ev-1" });
    expect(await publishWriteup("u1", { challengeId: CHALLENGE, content: SOLUTION })).toEqual({
      ok: true,
      heldForReview: true,
    });
    expect(m.upsert).toHaveBeenCalledWith(expect.objectContaining({ isHidden: true }));
    expect(m.attachContent).toHaveBeenCalledWith("ev-1", "w-1");
    expect(m.announceModeration).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", surface: "challenge.writeup", stage: "held" }),
    );
  });

  it("writes nothing for a throttled account, a short text, a flood or a missing challenge", async () => {
    m.screen.mockResolvedValue({ flagged: true, throttled: true, eventId: "ev-2" });
    expect(await publishWriteup("u1", { challengeId: CHALLENGE, content: SOLUTION })).toEqual({
      ok: false,
      error: "Trop de messages signalés.",
    });
    expect(await publishWriteup("u1", { challengeId: CHALLENGE, content: "Trop court." })).toEqual({
      ok: false,
      error: "Une solution de 40 caractères au minimum : explique ta démarche.",
    });
    m.findChallenge.mockResolvedValue(null);
    expect(await publishWriteup("u1", { challengeId: CHALLENGE, content: SOLUTION })).toEqual({
      ok: false,
      error: "Défi introuvable.",
    });
    m.checkQaSubmission.mockResolvedValue({ success: false });
    expect(await publishWriteup("u1", { challengeId: CHALLENGE, content: SOLUTION })).toMatchObject(
      { ok: false },
    );
    expect(m.upsert).not.toHaveBeenCalled();
  });
});

describe("deleteWriteup", () => {
  it("removes the reader's own solution, and says when there was none", async () => {
    m.deleteOwn.mockResolvedValue(1);
    expect(await deleteWriteup("u1", CHALLENGE)).toEqual({ ok: true });
    expect(m.deleteOwn).toHaveBeenCalledWith("u1", CHALLENGE);
    m.deleteOwn.mockResolvedValue(0);
    expect(await deleteWriteup("u1", CHALLENGE)).toEqual({
      ok: false,
      error: "Aucune solution à retirer.",
    });
    expect(await deleteWriteup("u1", 42)).toEqual({ ok: false, error: "Défi introuvable." });
  });
});
