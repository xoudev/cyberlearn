import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  checkNotifyingWrite: vi.fn<(userId: string) => Promise<{ success: boolean }>>(),
  between: vi.fn<(a: string, b: string) => Promise<{ status: string } | null>>(),
  pathFindFirst: vi.fn<(args: { where: { visibleTo?: string } }) => Promise<unknown>>(),
  lessonFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  loadSources: vi.fn<(pathId: string) => Promise<unknown[]>>(),
  notify: vi.fn<(data: unknown) => Promise<string>>(),
  findById: vi.fn<(id: string) => Promise<unknown>>(),
  findOpenBetween: vi.fn<(a: string, b: string) => Promise<unknown>>(),
  create: vi.fn<(input: Record<string, unknown>) => Promise<unknown>>(),
  transition: vi.fn<(id: string, from: string, data: unknown) => Promise<boolean>>(),
  listFor: vi.fn<(userId: string) => Promise<unknown[]>>(),
  listAnswers: vi.fn<(duelId: string) => Promise<unknown[]>>(),
  recordAnswer: vi.fn<(input: unknown) => Promise<boolean>>(),
  listOverdueFor: vi.fn<(userId: string, now: Date) => Promise<unknown[]>>(),
  recordFor: vi.fn<(userId: string, now: Date) => Promise<unknown>>(),
  listOpenFor: vi.fn<(userId: string) => Promise<unknown[]>>(),
  listInvitationsFor: vi.fn<(userId: string, now: Date) => Promise<unknown[]>>(),
  listFriends: vi.fn<(userId: string) => Promise<unknown[]>>(),
  pathFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  resolveAvatarSrcMany: vi.fn<(values: (string | null)[]) => Promise<(string | null)[]>>(),
  profilesOpenTo: vi.fn<(viewerId: string, ids: readonly string[]) => Promise<Set<string>>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  pathsVisibleTo: (userId: string) => ({ visibleTo: userId }),
  prisma: {
    path: { findFirst: m.pathFindFirst, findMany: m.pathFindMany },
    lesson: { findMany: m.lessonFindMany },
  },
  friendshipRepository: { between: m.between, listFriends: m.listFriends },
  notificationRepository: { create: m.notify },
  userRepository: { profilesOpenTo: m.profilesOpenTo },
  duelRepository: {
    findById: m.findById,
    findOpenBetween: m.findOpenBetween,
    create: m.create,
    transition: m.transition,
    listFor: m.listFor,
    listAnswers: m.listAnswers,
    recordAnswer: m.recordAnswer,
    listOverdueFor: m.listOverdueFor,
    recordFor: m.recordFor,
    listOpenFor: m.listOpenFor,
    listInvitationsFor: m.listInvitationsFor,
  },
}));
vi.mock("@/lib/avatar/storage", () => ({ resolveAvatarSrcMany: m.resolveAvatarSrcMany }));
vi.mock("@/lib/exam/mock-exam", () => ({ loadSources: m.loadSources }));
vi.mock("@/lib/rate-limit", () => ({ checkNotifyingWrite: m.checkNotifyingWrite }));

const {
  answerDuel,
  createDuel,
  duelRecordFor,
  duelSetupFor,
  duelViewFor,
  listDuelInvitationsFor,
  listDuelsFor,
  respondToDuel,
} = await import("../duels");

const ME = "11111111-1111-4111-8111-111111111111";
const FRIEND = "22222222-2222-4222-8222-222222222222";
const PATH = "33333333-3333-4333-8333-333333333333";
const DUEL = "44444444-4444-4444-8444-444444444444";

function quizzes(lessonId: string, n: number): string {
  return Array.from(
    { length: n },
    (_, k) =>
      `<Quiz id="q${String(k)}" question="${lessonId} ${String(k)} ?" options={["A", "B", "C"]} correct={2} />`,
  ).join("\n\n");
}

function sources(lessonId: string, n: number): unknown[] {
  return Array.from({ length: n }, (_, k) => ({
    lessonId,
    quizId: `q${String(k)}`,
    domain: "Module 01",
    question: `${lessonId} ${String(k)} ?`,
    options: ["A", "B", "C"],
    correct: 2,
    explanation: null,
  }));
}

const REFS = Array.from({ length: 5 }, (_, k) => ({
  lessonId: "l1",
  quizId: `q${String(k)}`,
  domain: "Module 01",
  order: [2, 0, 1],
}));

function duelRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: DUEL,
    challengerId: ME,
    opponentId: FRIEND,
    pathId: PATH,
    status: "ACTIVE",
    questions: REFS,
    createdAt: new Date(),
    acceptedAt: new Date(),
    finishedAt: null,
    expiresAt: new Date(Date.now() + 3_600_000),
    winnerId: null,
    challenger: { id: ME, displayName: "Moi", username: "moi", avatarUrl: null },
    opponent: { id: FRIEND, displayName: "Alex", username: "alex", avatarUrl: "__upload:alex.png" },
    path: { title: "Linux", slug: "linux" },
    ...overrides,
  };
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.checkNotifyingWrite.mockResolvedValue({ success: true });
  m.between.mockResolvedValue({ status: "ACCEPTED" });
  m.pathFindFirst.mockResolvedValue({ id: PATH });
  m.loadSources.mockResolvedValue(sources("l1", 8));
  m.findOpenBetween.mockResolvedValue(null);
  m.create.mockImplementation((input) => Promise.resolve(duelRow({ ...input, status: "PENDING" })));
  m.transition.mockResolvedValue(true);
  m.lessonFindMany.mockResolvedValue([{ id: "l1", contentMdx: quizzes("l1", 8) }]);
  m.listAnswers.mockResolvedValue([]);
  m.recordAnswer.mockResolvedValue(true);
  m.resolveAvatarSrcMany.mockImplementation((values) =>
    Promise.resolve(values.map((v) => (v === null ? null : `https://signed/${v}`))),
  );
  m.profilesOpenTo.mockImplementation((_viewer, ids) => Promise.resolve(new Set(ids)));
});

describe("createDuel", () => {
  it("challenges a friend on a path both may open, with five questions, and tells them", async () => {
    expect(await createDuel(ME, { opponentId: FRIEND, pathId: PATH })).toEqual({
      ok: true,
      id: DUEL,
    });
    const input = m.create.mock.calls[0]?.[0];
    expect(input).toMatchObject({ challengerId: ME, opponentId: FRIEND, pathId: PATH });
    expect(input?.questions).toHaveLength(5);
    expect(JSON.stringify(input?.questions)).not.toContain("correct");
    expect(m.pathFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: PATH, visibleTo: FRIEND } }),
    );
    expect(m.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: FRIEND, type: "DUEL_INVITE", actionUrl: `/duels/${DUEL}` }),
    );
  });

  it("refuses a stranger, oneself, a path one of them cannot open, a second duel, a thin path", async () => {
    m.between.mockResolvedValue({ status: "PENDING" });
    expect(await createDuel(ME, { opponentId: FRIEND, pathId: PATH })).toEqual({
      ok: false,
      error: "Tu ne peux défier que tes amis.",
    });
    m.between.mockResolvedValue({ status: "ACCEPTED" });
    expect(await createDuel(ME, { opponentId: ME, pathId: PATH })).toMatchObject({ ok: false });
    m.pathFindFirst.mockImplementation((args) =>
      Promise.resolve(args.where.visibleTo === FRIEND ? null : { id: PATH }),
    );
    expect(await createDuel(ME, { opponentId: FRIEND, pathId: PATH })).toEqual({
      ok: false,
      error: "Ce parcours n'est pas ouvert à vous deux.",
    });
    m.pathFindFirst.mockResolvedValue({ id: PATH });
    m.findOpenBetween.mockResolvedValue({ id: "autre" });
    expect(await createDuel(ME, { opponentId: FRIEND, pathId: PATH })).toEqual({
      ok: false,
      error: "Un duel est déjà en cours entre vous deux.",
    });
    m.findOpenBetween.mockResolvedValue(null);
    m.loadSources.mockResolvedValue(sources("l1", 3));
    expect(await createDuel(ME, { opponentId: FRIEND, pathId: PATH })).toEqual({
      ok: false,
      error: "Ce parcours n'a pas encore assez de questions pour un duel.",
    });
    expect(m.create).not.toHaveBeenCalled();
  });
});

describe("respondToDuel", () => {
  it("lets the challenged friend accept, starting the day, and tells the challenger", async () => {
    m.findById.mockResolvedValue(duelRow({ status: "PENDING" }));
    expect(await respondToDuel(FRIEND, DUEL, true)).toEqual({ ok: true });
    expect(m.transition).toHaveBeenCalledWith(
      DUEL,
      "PENDING",
      expect.objectContaining({ status: "ACTIVE" }),
    );
    expect(m.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: ME, type: "DUEL_INVITE" }),
    );
  });

  it("lets them decline, and nobody else answer for them", async () => {
    m.findById.mockResolvedValue(duelRow({ status: "PENDING" }));
    expect(await respondToDuel(FRIEND, DUEL, false)).toEqual({ ok: true });
    expect(m.transition).toHaveBeenCalledWith(DUEL, "PENDING", { status: "DECLINED" });
    expect(await respondToDuel(ME, DUEL, true)).toEqual({ ok: false, error: "Duel introuvable." });
  });

  it("lets a pending duel lapse after its day", async () => {
    m.findById.mockResolvedValue(
      duelRow({ status: "PENDING", expiresAt: new Date(Date.now() - 1000) }),
    );
    expect(await respondToDuel(FRIEND, DUEL, true)).toEqual({
      ok: false,
      error: "Ce duel n'attend plus de réponse.",
    });
    expect(m.transition).toHaveBeenCalledWith(DUEL, "PENDING", { status: "EXPIRED" });
  });
});

describe("answerDuel and duelViewFor", () => {
  it("checks an answer on the server and reveals the right option", async () => {
    m.findById.mockResolvedValue(duelRow());
    // order [2, 0, 1]: the right original option 2 is shown first.
    expect(await answerDuel(ME, { duelId: DUEL, index: 0, selected: 0 })).toEqual({
      ok: true,
      correct: true,
      correctIndex: 0,
    });
    expect(m.recordAnswer).toHaveBeenCalledWith({
      duelId: DUEL,
      userId: ME,
      index: 0,
      selected: 0,
      correct: true,
    });
    m.recordAnswer.mockResolvedValue(false);
    expect(await answerDuel(ME, { duelId: DUEL, index: 0, selected: 1 })).toEqual({
      ok: false,
      error: "Tu as déjà répondu à cette question.",
    });
    expect(await answerDuel(ME, { duelId: DUEL, index: 9, selected: 0 })).toEqual({
      ok: false,
      error: "Réponse invalide.",
    });
  });

  it("settles the duel once both are done, and tells both the result", async () => {
    m.findById.mockResolvedValue(duelRow());
    const at = new Date();
    const answers = [
      ...REFS.map((_, k) => ({ userId: ME, index: k, selected: 0, correct: true, answeredAt: at })),
      ...REFS.map((_, k) => ({
        userId: FRIEND,
        index: k,
        selected: 1,
        correct: k < 2,
        answeredAt: at,
      })),
    ];
    m.listAnswers.mockResolvedValue(answers);
    const view = await duelViewFor(ME, DUEL);
    expect(m.transition).toHaveBeenCalledWith(
      DUEL,
      "ACTIVE",
      expect.objectContaining({ status: "FINISHED", winnerId: ME }),
    );
    expect(m.notify).toHaveBeenCalledTimes(2);
    expect(view).toMatchObject({
      status: "FINISHED",
      winner: "reader",
      readerScore: { answered: 5, correct: 5 },
      otherScore: { answered: 5, correct: 2 },
      readerIsChallenger: true,
    });
    expect(view?.questions).toHaveLength(5);
    expect(view?.readerAnswers[0]).toEqual({
      index: 0,
      selected: 0,
      correct: true,
      correctIndex: 0,
    });
  });

  it("shows nothing to someone outside the duel, and no question before it is accepted", async () => {
    m.findById.mockResolvedValue(duelRow());
    expect(await duelViewFor("55555555-5555-4555-8555-555555555555", DUEL)).toBeNull();
    m.findById.mockResolvedValue(duelRow({ status: "PENDING" }));
    const pending = await duelViewFor(FRIEND, DUEL);
    expect(pending?.questions).toEqual([]);
    expect(pending?.readerIsChallenger).toBe(false);
  });
});

describe("listDuelsFor", () => {
  it("lists the reader's duels with both scores", async () => {
    m.listFor.mockResolvedValue([duelRow({ status: "DECLINED" })]);
    const list = await listDuelsFor(ME);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      status: "DECLINED",
      other: { name: "Alex" },
      questionCount: 5,
    });
  });

  it("draws every player's picture, signed once, and links the other's profile when it opens", async () => {
    m.listFor.mockResolvedValue([
      duelRow({ status: "DECLINED" }),
      duelRow({ id: "two", status: "DECLINED" }),
    ]);
    const [first] = await listDuelsFor(ME);
    expect(m.resolveAvatarSrcMany).toHaveBeenCalledTimes(1);
    expect(m.resolveAvatarSrcMany).toHaveBeenCalledWith([null, "__upload:alex.png"]);
    // The reader's own side is never a link; only the others are asked about.
    expect(m.profilesOpenTo).toHaveBeenCalledWith(ME, [FRIEND]);
    expect(first?.other).toMatchObject({
      avatarSrc: "https://signed/__upload:alex.png",
      profileHref: "/u/alex",
    });
    expect(first?.reader).toMatchObject({ avatarSrc: null, profileHref: null });
  });

  it("names a player whose profile is closed to the reader without a link", async () => {
    m.listFor.mockResolvedValue([duelRow({ status: "DECLINED" })]);
    m.profilesOpenTo.mockResolvedValue(new Set());
    const [only] = await listDuelsFor(ME);
    expect(only?.other.profileHref).toBeNull();
    expect(only?.other.name).toBe("Alex");
  });
});

describe("listDuelInvitationsFor", () => {
  it("lists the invitations waiting on the reader, from their seat, without reading answers", async () => {
    const now = new Date("2026-10-17T12:00:00Z");
    m.listInvitationsFor.mockResolvedValue([
      duelRow({
        status: "PENDING",
        challengerId: FRIEND,
        opponentId: ME,
        acceptedAt: null,
        challenger: { id: FRIEND, displayName: "Alex", username: "alex" },
        opponent: { id: ME, displayName: "Moi", username: "moi" },
      }),
    ]);
    const list = await listDuelInvitationsFor(ME, now);
    expect(m.listInvitationsFor).toHaveBeenCalledWith(ME, now);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      status: "PENDING",
      readerIsChallenger: false,
      other: { name: "Alex" },
      pathTitle: "Linux",
      questionCount: 5,
    });
    expect(m.listAnswers).not.toHaveBeenCalled();
  });
});

describe("duelRecordFor", () => {
  it("settles the reader's overdue duels, then counts every duel in the database", async () => {
    const now = new Date("2026-10-17T12:00:00Z");
    m.listOverdueFor.mockResolvedValue([
      duelRow({ status: "ACTIVE", expiresAt: new Date("2026-10-17T11:00:00Z") }),
      duelRow({ id: "lapsed", status: "PENDING", expiresAt: new Date("2026-10-17T10:00:00Z") }),
    ]);
    m.listAnswers.mockResolvedValue([
      { userId: ME, index: 0, selected: 0, correct: true, answeredAt: now },
    ]);
    m.recordFor.mockResolvedValue({ win: 7, loss: 2, draw: 1, live: 0, wait: 0 });

    expect(await duelRecordFor(ME, now)).toEqual({ win: 7, loss: 2, draw: 1, live: 0, wait: 0 });
    expect(m.transition).toHaveBeenCalledWith(DUEL, "ACTIVE", {
      status: "FINISHED",
      finishedAt: now,
      winnerId: ME,
    });
    expect(m.transition).toHaveBeenCalledWith("lapsed", "PENDING", { status: "EXPIRED" });
    expect(m.recordFor).toHaveBeenCalledWith(ME, now);
    // Settled before counted: the count reads the duels as they now stand.
    const settledAt = m.transition.mock.invocationCallOrder.at(-1) ?? 0;
    expect(m.recordFor.mock.invocationCallOrder[0]).toBeGreaterThan(settledAt);
  });
});

describe("duelSetupFor", () => {
  const SAM = "55555555-5555-4555-8555-555555555555";

  function friend(id: string, displayName: string, xpTotal: number, avatarUrl: string | null) {
    return {
      id: `edge-${id}`,
      status: "ACCEPTED",
      requestedById: ME,
      createdAt: new Date(),
      person: {
        id,
        username: displayName.toLowerCase(),
        displayName,
        avatarUrl,
        level: 1,
        xpTotal,
      },
    };
  }

  beforeEach(() => {
    m.listFriends.mockResolvedValue([
      friend(FRIEND, "Alex", 250, "__upload:alex.png"),
      friend(SAM, "Sam", 0, null),
    ]);
    m.pathFindMany.mockResolvedValue([{ id: PATH, title: "Linux" }]);
    m.resolveAvatarSrcMany.mockImplementation((values) =>
      Promise.resolve(values.map((v) => (v === null ? null : "https://signed/alex.png"))),
    );
    m.listOpenFor.mockResolvedValue([]);
  });

  it("gives each friend's avatar, handle and level, and the paths a duel can be sent on", async () => {
    expect(await duelSetupFor(ME)).toEqual({
      friends: [
        {
          id: FRIEND,
          name: "Alex",
          username: "alex",
          avatarSrc: "https://signed/alex.png",
          level: 2,
          openDuelId: null,
        },
        { id: SAM, name: "Sam", username: "sam", avatarSrc: null, level: 1, openDuelId: null },
      ],
      paths: [{ id: PATH, title: "Linux" }],
    });
    // Every picture signed in one call, not one per friend.
    expect(m.resolveAvatarSrcMany).toHaveBeenCalledTimes(1);
  });

  it("names the duel still open with a friend, whichever of the two sent it", async () => {
    m.listOpenFor.mockResolvedValue([
      duelRow({ challengerId: FRIEND, opponentId: ME, status: "PENDING" }),
    ]);
    const { friends } = await duelSetupFor(ME);
    expect(friends.map((f) => f.openDuelId)).toEqual([DUEL, null]);
  });

  it("frees a friend whose open duel has run out of time", async () => {
    m.listOpenFor.mockResolvedValue([
      duelRow({ status: "PENDING", expiresAt: new Date(Date.now() - 1000) }),
    ]);
    const { friends } = await duelSetupFor(ME);
    expect(friends.map((f) => f.openDuelId)).toEqual([null, null]);
    expect(m.transition).toHaveBeenCalledWith(DUEL, "PENDING", { status: "EXPIRED" });
  });
});
