import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  audienceFor: vi.fn<(authorId: string) => Promise<unknown[]>>(),
  listRecipients: vi.fn<(authorId: string, noteId: string) => Promise<{ id: string }[]>>(),
  listSharedWithMe: vi.fn<(userId: string) => Promise<unknown[]>>(),
  share: vi.fn<(input: unknown) => Promise<unknown>>(),
  unshare: vi.fn<(authorId: string, noteId: string, recipientId: string) => Promise<boolean>>(),
  announceModeration: vi.fn<(input: unknown) => Promise<void>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  noteShareRepository: {
    audienceFor: m.audienceFor,
    listRecipients: m.listRecipients,
    listSharedWithMe: m.listSharedWithMe,
    share: m.share,
    unshare: m.unshare,
  },
}));
vi.mock("@cyberlearn/lib", () => ({
  labelRules: (rules: string[]) => rules.map((r) => `règle ${r}`),
}));
vi.mock("@/lib/moderation/announce", () => ({ announceModeration: m.announceModeration }));

const { shareAudienceFor, shareNoteFor, sharedWithMeFor, unshareNoteFor } = await import(
  "../note-share"
);

const ME = "0b9a8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d";
const NOTE = "1c0b9a8d-7e6f-4b5a-8c3d-2e1f0a9b8c7d";
const PEER = "2d1c0b9a-8e7f-4c6b-9d4e-3f2a1b0c9d8e";

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
});

describe("shareAudienceFor", () => {
  it("lists the author's people, marks who already holds the note, names the nameless", async () => {
    m.audienceFor.mockResolvedValue([
      {
        id: PEER,
        username: "sam",
        displayName: " ",
        avatarUrl: null,
        kind: "PEER",
        groupId: "class-1",
        groupLabel: "3A",
      },
      {
        id: "t",
        username: null,
        displayName: "Mme Martin",
        avatarUrl: null,
        kind: "TEACHER",
        groupId: "class-1",
        groupLabel: "3A",
      },
    ]);
    m.listRecipients.mockResolvedValue([{ id: PEER }]);

    const state = await shareAudienceFor(ME, NOTE);
    expect(m.audienceFor).toHaveBeenCalledWith(ME);
    expect(m.listRecipients).toHaveBeenCalledWith(ME, NOTE);
    expect(state.noAudience).toBe(false);
    expect(state.entries.map((e) => [e.name, e.holds])).toEqual([
      ["sam", true],
      ["Mme Martin", false],
    ]);
  });

  it("says there is nobody when the author has no class and no friend", async () => {
    m.audienceFor.mockResolvedValue([]);
    m.listRecipients.mockResolvedValue([]);
    expect(await shareAudienceFor(ME, NOTE)).toEqual({ entries: [], noAudience: true });
  });

  it("reads nothing for an id that is not one", async () => {
    expect(await shareAudienceFor(ME, "nope")).toEqual({ entries: [], noAudience: true });
    expect(m.audienceFor).not.toHaveBeenCalled();
  });
});

describe("shareNoteFor", () => {
  it("refuses a selection that is not one, before the repository", async () => {
    expect(await shareNoteFor(ME, { noteId: NOTE, recipientIds: [] })).toEqual({
      ok: false,
      error: "Sélection invalide.",
    });
    expect(await shareNoteFor(ME, null)).toMatchObject({ ok: false });
    expect(m.share).not.toHaveBeenCalled();
  });

  it("shares as the caller, whatever the input claims", async () => {
    m.share.mockResolvedValue({ ok: true, shared: 2, alreadyShared: 0, refused: [] });
    const result = await shareNoteFor(ME, {
      noteId: NOTE,
      recipientIds: [PEER],
      authorId: "someone-else",
    });
    expect(result).toEqual({ ok: true, shared: 2 });
    expect(m.share).toHaveBeenCalledWith({ authorId: ME, noteId: NOTE, recipientIds: [PEER] });
  });

  it("explains a refusal by the screen, tells the author, and names the rules", async () => {
    m.share.mockResolvedValue({
      ok: false,
      reason: "BLOCKED",
      teachersNotified: 1,
      rules: ["insult"],
      eventId: "ev",
    });
    const result = await shareNoteFor(ME, { noteId: NOTE, recipientIds: [PEER] });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Partage refusé");
    expect(result.error).toContain("Motif : règle insult.");
    expect(result.error).toContain("Ton professeur en a été informé.");
    expect(m.announceModeration.mock.calls[0]?.[0]).toMatchObject({
      userId: ME,
      surface: "note.share",
      stage: "refused",
    });
  });

  it.each([
    ["EMPTY", "Cette note est vide."],
    ["NO_RECIPIENT", "Choisis au moins une personne."],
    ["NOT_FOUND", "Note introuvable."],
  ] as const)("words the other refusals (%s) and announces nothing", async (reason, error) => {
    m.share.mockResolvedValue({ ok: false, reason });
    expect(await shareNoteFor(ME, { noteId: NOTE, recipientIds: [PEER] })).toEqual({
      ok: false,
      error,
    });
    expect(m.announceModeration).not.toHaveBeenCalled();
  });
});

describe("unshareNoteFor", () => {
  it("takes the note back as the caller", async () => {
    m.unshare.mockResolvedValue(true);
    expect(await unshareNoteFor(ME, NOTE, PEER)).toEqual({ ok: true });
    expect(m.unshare).toHaveBeenCalledWith(ME, NOTE, PEER);
  });

  it("refuses ids that are not ones", async () => {
    expect(await unshareNoteFor(ME, NOTE, 7)).toEqual({ ok: false });
    expect(m.unshare).not.toHaveBeenCalled();
  });
});

describe("sharedWithMeFor", () => {
  it("sends the received notes with ISO dates and without the author's avatar value", async () => {
    m.listSharedWithMe.mockResolvedValue([
      {
        id: NOTE,
        content: "# TCP",
        wordCount: 2,
        updatedAt: new Date("2026-09-20T10:00:00Z"),
        sharedAt: new Date("2026-09-21T11:00:00Z"),
        lessonSlug: "tcp",
        lessonTitle: "TCP",
        lessonCategory: "NETWORK",
        authorId: PEER,
        authorName: "Sam",
        authorAvatarUrl: "__upload:sam.png",
      },
    ]);
    const notes = await sharedWithMeFor(ME);
    expect(m.listSharedWithMe).toHaveBeenCalledWith(ME);
    expect(notes).toEqual([
      {
        id: NOTE,
        content: "# TCP",
        wordCount: 2,
        updatedAt: "2026-09-20T10:00:00.000Z",
        sharedAt: "2026-09-21T11:00:00.000Z",
        lessonSlug: "tcp",
        lessonTitle: "TCP",
        lessonCategory: "NETWORK",
        authorName: "Sam",
      },
    ]);
  });
});
