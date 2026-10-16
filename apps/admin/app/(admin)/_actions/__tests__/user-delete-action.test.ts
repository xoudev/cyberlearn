import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn<() => Promise<{ id: string }>>(),
  findUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  deleteAccount: vi.fn<(id: string, context: unknown) => Promise<unknown>>(),
  auditCreate: vi.fn<(args: unknown) => Promise<unknown>>(),
  sendAccountDeletedEmail: vi.fn<(options: Record<string, unknown>) => Promise<void>>(),
  revalidatePath: vi.fn<(path: string) => void>(),
  redirect: vi.fn<(url: string) => never>(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  UserRole: { STUDENT: "STUDENT", TEACHER: "TEACHER", ADMIN: "ADMIN" },
  userRepository: {},
  prisma: { user: { findUnique: m.findUnique }, auditLog: { create: m.auditCreate } },
  banRepository: {},
  deleteAccount: m.deleteAccount,
  resetProgress: vi.fn(),
}));
vi.mock("@cyberlearn/email", () => ({
  sendAccountDeletedEmail: m.sendAccountDeletedEmail,
  sendBanNoticeEmail: vi.fn(),
}));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: vi.fn() },
  errorMessage: (error: unknown) => String(error),
}));
vi.mock("@/lib/env", () => ({
  env: { RESEND_API_KEY: "re_test", RESEND_FROM_EMAIL: "noreply@cyberlearn.fr" },
}));
vi.mock("@/lib/learner-url", () => ({ learnerUrl: vi.fn(), learnerSiteUrl: vi.fn() }));
vi.mock("next/headers", () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));

const { deleteUserAction } = await import("../user-actions");

/**
 * Deleting an account from its own page. Once it has run that page no longer
 * exists: it used to answer with Next's default 404 and lose the warnings with
 * it. It now goes back to the list, warnings in the address.
 */

const ADMIN = "11111111-1111-4111-8111-111111111111";
const TARGET = "22222222-2222-4222-8222-222222222222";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

const TYPED = form({ userId: TARGET, confirmEmail: "amelie@exemple.fr" });

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: ADMIN });
  m.findUnique.mockResolvedValue({
    id: TARGET,
    email: "amelie@exemple.fr",
    displayName: "Amélie",
    username: "amelie",
    role: "STUDENT",
  });
  m.deleteAccount.mockResolvedValue({
    deletedAt: new Date("2026-10-16T08:00:00Z"),
    hashedUserId: "hash",
    authIdentityDeleted: true,
  });
  m.auditCreate.mockResolvedValue({});
  m.sendAccountDeletedEmail.mockResolvedValue(undefined);
  m.redirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
});

describe("deleteUserAction", () => {
  it("goes back to the list once the account is gone", async () => {
    await expect(deleteUserAction({}, TYPED)).rejects.toThrow("NEXT_REDIRECT:/users?supprime=ok");
  });

  it("carries both warnings to the list", async () => {
    m.deleteAccount.mockResolvedValue({
      deletedAt: new Date("2026-10-16T08:00:00Z"),
      hashedUserId: "hash",
      authIdentityDeleted: false,
    });
    m.sendAccountDeletedEmail.mockRejectedValue(new Error("resend down"));
    await expect(deleteUserAction({}, TYPED)).rejects.toThrow(
      "NEXT_REDIRECT:/users?supprime=mail-auth",
    );
  });

  it("stays on the page, with its reason, when it refuses", async () => {
    const result = await deleteUserAction(
      {},
      form({ userId: TARGET, confirmEmail: "quelquun@exemple.fr" }),
    );
    expect(result.error).toMatch(/ne correspond pas/u);
    expect(m.deleteAccount).not.toHaveBeenCalled();
    expect(m.redirect).not.toHaveBeenCalled();
  });

  it("tells the person to write to the privacy address, not to the sender", async () => {
    await expect(deleteUserAction({}, TYPED)).rejects.toThrow("NEXT_REDIRECT");
    expect(m.sendAccountDeletedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "noreply@cyberlearn.fr",
        contactEmail: "privacy@cyberlearn.fr",
      }),
    );
  });
});
