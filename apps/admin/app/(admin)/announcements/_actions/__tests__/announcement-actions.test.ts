import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn<() => Promise<{ id: string }>>(),
  listLiveOptions: vi.fn<() => Promise<{ id: string; name: string }[]>>(),
  countForAudience: vi.fn<(audience: unknown, now: Date) => Promise<number>>(),
  idsForAudience: vi.fn<(audience: unknown, now: Date) => Promise<string[]>>(),
  createMany:
    vi.fn<
      (
        rows: Record<string, unknown>[],
        options: { audit: Record<string, unknown> & { metadata: Record<string, unknown> } },
      ) => Promise<number>
    >(),
  checkAnnouncementRateLimit: vi.fn<(adminId: string) => Promise<boolean>>(),
  revalidatePath: vi.fn<(path: string) => void>(),
  logError: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@/lib/rate-limit", () => ({ checkAnnouncementRateLimit: m.checkAnnouncementRateLimit }));
vi.mock("@cyberlearn/db", () => ({
  classRepository: { listLiveOptions: m.listLiveOptions },
  userRepository: { countForAudience: m.countForAudience, idsForAudience: m.idsForAudience },
  notificationRepository: { createMany: m.createMany },
}));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: m.logError },
  errorMessage: (error: unknown) => String(error),
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

const { countAnnouncementRecipientsAction, sendAnnouncementAction } = await import(
  "../announcement-actions"
);

/**
 * Sending an announcement from the console: Zod on what the form sends, the
 * console's own gate, a count confirmed before anything leaves, the rows and
 * their audit trace handed to the repository together.
 */

const ADMIN = "11111111-1111-4111-8111-111111111111";
const CLASS_A = "22222222-2222-4222-8222-222222222222";
const CLASS_B = "33333333-3333-4333-8333-333333333333";

const VALID = {
  title: "Maintenance samedi",
  body: "Le site sera coupé de 8 h à 9 h.",
  actionUrl: "",
  audience: { kind: "ALL" },
};

/** The refusal's sentence, or "" for a result that went through. */
function errorOf(result: { ok: true } | { ok: false; error: string }): string {
  return result.ok ? "" : result.error;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: ADMIN });
  m.listLiveOptions.mockResolvedValue([
    { id: CLASS_A, name: "SIO1-A" },
    { id: CLASS_B, name: "SIO1-B" },
  ]);
  m.countForAudience.mockResolvedValue(3);
  m.idsForAudience.mockResolvedValue(["u-1", "u-2", "u-3"]);
  m.createMany.mockImplementation((rows) => Promise.resolve(rows.length));
  m.checkAnnouncementRateLimit.mockResolvedValue(true);
});

describe("the console's gate", () => {
  it("lets a session that is not an administrator's neither count nor send", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(countAnnouncementRecipientsAction(VALID)).rejects.toThrow("NEXT_REDIRECT");
    await expect(sendAnnouncementAction({ ...VALID, confirmedRecipients: 3 })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(m.countForAudience).not.toHaveBeenCalled();
    expect(m.idsForAudience).not.toHaveBeenCalled();
    expect(m.createMany).not.toHaveBeenCalled();
  });
});

describe("what the form may send", () => {
  it.each([
    ["a title too short", { ...VALID, title: "ok" }, /3 caractères au moins/u],
    ["a title past 200 characters", { ...VALID, title: "x".repeat(201) }, /200 caractères/u],
    ["an empty message", { ...VALID, body: "   " }, /message de l'annonce/u],
    ["a message past 1 000 characters", { ...VALID, body: "x".repeat(1001) }, /1 000/u],
    [
      "a link to another site",
      { ...VALID, actionUrl: "https://evil.example" },
      /une seule « \/ »/u,
    ],
    ["a protocol-relative link", { ...VALID, actionUrl: "//evil.example" }, /une seule « \/ »/u],
    ["no audience", { ...VALID, audience: undefined }, /à qui envoyer/u],
    ["an audience of no role", { ...VALID, audience: { kind: "ROLES", roles: [] } }, /un rôle/u],
    [
      "a role that does not exist",
      { ...VALID, audience: { kind: "ROLES", roles: ["ROOT"] } },
      /rôles choisis/u,
    ],
    [
      "an audience of no class",
      { ...VALID, audience: { kind: "CLASSES", classIds: [] } },
      /classe/u,
    ],
  ])("refuses %s, and counts nobody", async (_name, input, message) => {
    const result = await countAnnouncementRecipientsAction(input);
    expect(result.ok).toBe(false);
    expect(errorOf(result)).toMatch(message);
    expect(m.countForAudience).not.toHaveBeenCalled();
  });

  it("refuses a send without the count it confirmed", async () => {
    const result = await sendAnnouncementAction(VALID);
    expect(result.ok).toBe(false);
    expect(m.idsForAudience).not.toHaveBeenCalled();
  });
});

describe("countAnnouncementRecipientsAction", () => {
  it("says how many accounts the audience reaches", async () => {
    m.countForAudience.mockResolvedValue(1234);
    await expect(
      countAnnouncementRecipientsAction({
        ...VALID,
        audience: { kind: "ROLES", roles: ["TEACHER", "TEACHER"] },
      }),
    ).resolves.toEqual({ ok: true, recipients: 1234 });
    // Each role once, whatever the form sent.
    expect(m.countForAudience).toHaveBeenCalledWith(
      { kind: "ROLES", roles: ["TEACHER"] },
      expect.any(Date),
    );
  });

  it("says so when nobody matches", async () => {
    m.countForAudience.mockResolvedValue(0);
    const result = await countAnnouncementRecipientsAction(VALID);
    expect(result.ok).toBe(false);
    expect(errorOf(result)).toMatch(/Personne/u);
  });

  it("refuses a class archived since the page was opened", async () => {
    m.listLiveOptions.mockResolvedValue([{ id: CLASS_A, name: "SIO1-A" }]);
    const result = await countAnnouncementRecipientsAction({
      ...VALID,
      audience: { kind: "CLASSES", classIds: [CLASS_A, CLASS_B] },
    });
    expect(result.ok).toBe(false);
    expect(errorOf(result)).toMatch(/archivée/u);
    expect(m.countForAudience).not.toHaveBeenCalled();
  });

  it("answers in words when the classes cannot be read, rather than throwing", async () => {
    m.listLiveOptions.mockRejectedValue(new Error("connection reset"));
    const result = await countAnnouncementRecipientsAction({
      ...VALID,
      audience: { kind: "CLASSES", classIds: [CLASS_A] },
    });
    expect(result).toEqual({
      ok: false,
      error: "Les destinataires n'ont pas pu être comptés. Réessaie.",
    });
    expect(m.logError).toHaveBeenCalled();
    expect(m.countForAudience).not.toHaveBeenCalled();
  });
});

describe("sendAnnouncementAction", () => {
  it("sends one ANNOUNCEMENT per account, with its trace in the same call", async () => {
    const result = await sendAnnouncementAction({
      ...VALID,
      actionUrl: " /paths ",
      audience: { kind: "CLASSES", classIds: [CLASS_B, CLASS_A] },
      confirmedRecipients: 3,
    });

    expect(result).toEqual({ ok: true, sent: 3 });
    expect(m.createMany).toHaveBeenCalledTimes(1);
    const [rows, options] = m.createMany.mock.calls[0] ?? [[], { audit: { metadata: {} } }];
    const announcementId = options.audit.targetId;
    expect(typeof announcementId).toBe("string");
    expect(rows).toEqual(
      ["u-1", "u-2", "u-3"].map((userId) => ({
        userId,
        type: "ANNOUNCEMENT",
        title: "Maintenance samedi",
        body: "Le site sera coupé de 8 h à 9 h.",
        actionUrl: "/paths",
        metadata: { announcementId },
      })),
    );
    expect(options.audit).toEqual({
      actorId: ADMIN,
      action: "announcement.send",
      targetType: "Announcement",
      targetId: announcementId,
      metadata: {
        title: "Maintenance samedi",
        body: "Le site sera coupé de 8 h à 9 h.",
        actionUrl: "/paths",
        audience: { kind: "CLASSES", classIds: [CLASS_B, CLASS_A] },
        audienceLabel: "Classes : SIO1-B, SIO1-A",
        recipients: 3,
      },
    });
    expect(m.revalidatePath).toHaveBeenCalledWith("/announcements");
  });

  it("writes no link when none was given", async () => {
    await sendAnnouncementAction({ ...VALID, confirmedRecipients: 3 });
    const [rows, options] = m.createMany.mock.calls[0] ?? [[], { audit: { metadata: {} } }];
    expect(rows[0]?.actionUrl).toBeNull();
    expect(options.audit.metadata.actionUrl).toBeNull();
    expect(options.audit.metadata.audienceLabel).toBe("Tous les comptes");
  });

  it("sends nothing when the audience moved since the count, and gives the new one", async () => {
    m.idsForAudience.mockResolvedValue(["u-1", "u-2", "u-3", "u-4"]);
    const result = await sendAnnouncementAction({ ...VALID, confirmedRecipients: 3 });

    expect(result).toMatchObject({ ok: false, recipients: 4 });
    expect(errorOf(result)).toMatch(/a changé/u);
    expect(m.createMany).not.toHaveBeenCalled();
    expect(m.checkAnnouncementRateLimit).not.toHaveBeenCalled();
  });

  it("sends nothing, and says so, when the classes cannot be read", async () => {
    m.listLiveOptions.mockRejectedValue(new Error("connection reset"));
    const result = await sendAnnouncementAction({
      ...VALID,
      audience: { kind: "CLASSES", classIds: [CLASS_A] },
      confirmedRecipients: 3,
    });
    expect(result).toEqual({
      ok: false,
      error: "Les destinataires n'ont pas pu être lus. Rien n'a été envoyé.",
    });
    expect(m.logError).toHaveBeenCalled();
    expect(m.idsForAudience).not.toHaveBeenCalled();
    expect(m.createMany).not.toHaveBeenCalled();
  });

  it("sends nothing to an audience that has emptied", async () => {
    m.idsForAudience.mockResolvedValue([]);
    const result = await sendAnnouncementAction({ ...VALID, confirmedRecipients: 3 });
    expect(result).toMatchObject({ ok: false, recipients: 0 });
    expect(m.createMany).not.toHaveBeenCalled();
  });

  it("stops at the rate limit, keyed on the administrator", async () => {
    m.checkAnnouncementRateLimit.mockResolvedValue(false);
    const result = await sendAnnouncementAction({ ...VALID, confirmedRecipients: 3 });

    expect(result.ok).toBe(false);
    expect(errorOf(result)).toMatch(/Trop d'annonces/u);
    expect(m.checkAnnouncementRateLimit).toHaveBeenCalledWith(ADMIN);
    expect(m.createMany).not.toHaveBeenCalled();
  });

  it("says nobody received it when the write fails, and logs it", async () => {
    m.createMany.mockRejectedValue(new Error("connection reset"));
    const result = await sendAnnouncementAction({ ...VALID, confirmedRecipients: 3 });

    expect(result.ok).toBe(false);
    expect(errorOf(result)).toMatch(/personne ne l'a reçue/u);
    expect(m.logError).toHaveBeenCalled();
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});
