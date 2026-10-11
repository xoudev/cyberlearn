import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn(),
  changeRole: vi.fn(),
  auditCreate: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  UserRole: { STUDENT: "STUDENT", TEACHER: "TEACHER", ADMIN: "ADMIN" },
  userRepository: { changeRole: m.changeRole },
  prisma: { auditLog: { create: m.auditCreate } },
  banRepository: {},
  deleteAccount: vi.fn(),
  resetProgress: vi.fn(),
}));
vi.mock("@cyberlearn/lib", () => ({
  banExpiryFor: vi.fn(),
  banTimeLeft: vi.fn(),
  isBanDurationKey: vi.fn(),
}));
vi.mock("@cyberlearn/email", () => ({
  sendAccountDeletedEmail: vi.fn(),
  sendBanNoticeEmail: vi.fn(),
}));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: vi.fn() },
  errorMessage: (error: unknown) => String(error),
}));
vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("@/lib/learner-url", () => ({ learnerUrl: vi.fn(), learnerSiteUrl: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

const { LAST_ADMIN_REFUSAL } = await import("@/lib/account-guards");
const { updateUserRoleAction } = await import("../user-actions");

/**
 * Changing a role from the users list: never on oneself, never the last
 * administrator, and every refusal or failure comes back as a sentence the
 * list can show, instead of a thrown error that left the select silent.
 */

const ADMIN = "11111111-1111-4111-8111-111111111111";
const TARGET = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: ADMIN, email: "admin@x.fr", role: "ADMIN" });
  m.auditCreate.mockResolvedValue({});
});

describe("updateUserRoleAction", () => {
  it("refuses an administrator's demotion of themselves before touching the database", async () => {
    const result = await updateUserRoleAction(ADMIN, "STUDENT");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/propre rôle d'administrateur/u);
    expect(m.changeRole).not.toHaveBeenCalled();
  });

  it("refuses to demote the last administrator, with a way out", async () => {
    m.changeRole.mockResolvedValue({ ok: false, reason: "LAST_ADMIN" });
    const result = await updateUserRoleAction(TARGET, "TEACHER");
    expect(result).toEqual({ ok: false, error: LAST_ADMIN_REFUSAL });
    expect(m.auditCreate).not.toHaveBeenCalled();
  });

  it("says the account is gone rather than throwing", async () => {
    m.changeRole.mockResolvedValue({ ok: false, reason: "NOT_FOUND" });
    expect(await updateUserRoleAction(TARGET, "TEACHER")).toEqual({
      ok: false,
      error: "Ce compte n'existe plus.",
    });
  });

  it("turns a database failure into a sentence, and logs nothing to the audit", async () => {
    m.changeRole.mockRejectedValue(new Error("connection reset"));
    const result = await updateUserRoleAction(TARGET, "ADMIN");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/a échoué/u);
    expect(m.auditCreate).not.toHaveBeenCalled();
  });

  it("writes the change to the audit log with the role it replaced", async () => {
    m.changeRole.mockResolvedValue({ ok: true, previousRole: "STUDENT" });
    expect(await updateUserRoleAction(TARGET, "ADMIN")).toEqual({ ok: true });
    expect(m.changeRole).toHaveBeenCalledWith(TARGET, "ADMIN");
    expect(m.auditCreate).toHaveBeenCalledWith({
      data: {
        actorId: ADMIN,
        action: "user.role.update",
        targetType: "User",
        targetId: TARGET,
        metadata: { newRole: "ADMIN", previousRole: "STUDENT" },
      },
    });
    expect(m.revalidatePath).toHaveBeenCalledWith("/users");
  });

  it("logs nothing when the role did not change", async () => {
    m.changeRole.mockResolvedValue({ ok: true, previousRole: "TEACHER" });
    expect(await updateUserRoleAction(TARGET, "TEACHER")).toEqual({ ok: true });
    expect(m.auditCreate).not.toHaveBeenCalled();
  });

  it("refuses parameters that are not an id and a role", async () => {
    // A server action is an endpoint: the select sends a role, a crafted
    // request can send anything. Cast because the signature only admits roles.
    const result = await updateUserRoleAction("nope", "OWNER" as "ADMIN");
    expect(result).toEqual({ ok: false, error: "Paramètres invalides." });
    expect(m.changeRole).not.toHaveBeenCalled();
  });
});
