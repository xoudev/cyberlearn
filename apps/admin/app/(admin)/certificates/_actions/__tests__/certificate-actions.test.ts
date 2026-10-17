import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn<() => Promise<{ id: string }>>(),
  findForConsole: vi.fn(),
  revoke: vi.fn(),
  reinstate: vi.fn(),
  revalidatePath: vi.fn<(path: string) => void>(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  certificateRepository: {
    findForConsole: m.findForConsole,
    revoke: m.revoke,
    reinstate: m.reinstate,
  },
}));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: m.loggerError },
  errorMessage: (error: unknown) => String(error),
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

const { revokeCertificateAction, reinstateCertificateAction } = await import(
  "../certificate-actions"
);

/**
 * Revoking a certificate and putting it back, from the console: the input is
 * checked before anything is read, a refusal comes back as a sentence under
 * the form, and what reaches the repository is what the holder will read.
 */

const CERT = "11111111-1111-4111-8111-111111111111";
const HOLDER = "33333333-3333-4333-8333-333333333333";
const PUBLIC_ID = "1a2b3c4d-2222-4222-8222-222222222222";

const ROW = {
  id: CERT,
  publicId: PUBLIC_ID,
  userId: HOLDER,
  holderName: "Camille Martin",
  issuedAt: new Date("2026-09-20T10:00:00Z"),
  revokedAt: null,
  revokedReason: null,
  path: { title: "Réseau : les fondamentaux" },
};

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: "admin-1" });
  m.findForConsole.mockResolvedValue(ROW);
  m.revoke.mockResolvedValue({ ok: true });
  m.reinstate.mockResolvedValue({ ok: true });
});

describe("revokeCertificateAction", () => {
  it("revokes with the reason, the holder's notice and the number in the audit", async () => {
    const result = await revokeCertificateAction(
      {},
      form({ certificateId: CERT, reason: "  Examen passé par un tiers.  " }),
    );
    expect(result).toEqual({ ok: true });
    expect(m.revoke).toHaveBeenCalledOnce();
    const input = m.revoke.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(input).toMatchObject({
      id: CERT,
      reason: "Examen passé par un tiers.",
      actorId: "admin-1",
      notice: {
        title: "Certificat révoqué : Réseau : les fondamentaux",
        actionUrl: "/profile?tab=certificats",
      },
      metadata: { code: "CL-2026-1A2B3C4D", pathTitle: "Réseau : les fondamentaux" },
    });
    expect((input.notice as { body: string }).body).toContain("Examen passé par un tiers.");
    expect(m.revalidatePath).toHaveBeenCalledWith("/certificates");
    expect(m.revalidatePath).toHaveBeenCalledWith(`/users/${HOLDER}`);
  });

  it("checks the caller before it reads the form", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(
      revokeCertificateAction({}, form({ certificateId: CERT, reason: "Fraude avérée" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(m.findForConsole).not.toHaveBeenCalled();
  });

  it("refuses a reason too short to be answered, before reading anything", async () => {
    const result = await revokeCertificateAction({}, form({ certificateId: CERT, reason: "non" }));
    expect(result.error).toBe("Explique le motif : au moins 5 caractères.");
    expect(m.findForConsole).not.toHaveBeenCalled();
    expect(m.revoke).not.toHaveBeenCalled();
  });

  it("refuses a reason past 500 characters, and an id that is not one", async () => {
    const long = await revokeCertificateAction(
      {},
      form({ certificateId: CERT, reason: "x".repeat(501) }),
    );
    expect(long.error).toBe("Le motif tient en 500 caractères au plus.");
    const bad = await revokeCertificateAction(
      {},
      form({ certificateId: "../../etc", reason: "Fraude avérée" }),
    );
    expect(bad.error).toBeDefined();
    expect(m.revoke).not.toHaveBeenCalled();
  });

  it("says so when the certificate is gone", async () => {
    m.findForConsole.mockResolvedValue(null);
    const result = await revokeCertificateAction(
      {},
      form({ certificateId: CERT, reason: "Fraude avérée" }),
    );
    expect(result).toEqual({ error: "Ce certificat n'existe plus." });
    expect(m.revoke).not.toHaveBeenCalled();
    // The list drops the row instead of offering it again.
    expect(m.revalidatePath).toHaveBeenCalledWith("/certificates");
  });

  it("says so when it was revoked in the meantime, and redraws the row as it now stands", async () => {
    m.revoke.mockResolvedValue({ ok: false, reason: "ALREADY_REVOKED" });
    const result = await revokeCertificateAction(
      {},
      form({ certificateId: CERT, reason: "Fraude avérée" }),
    );
    expect(result).toEqual({ error: "Ce certificat est déjà révoqué." });
    expect(m.revalidatePath).toHaveBeenCalledWith("/certificates");
    expect(m.revalidatePath).toHaveBeenCalledWith(`/users/${HOLDER}`);
  });

  it("says the certificate is gone when it went between the read and the write", async () => {
    m.revoke.mockResolvedValue({ ok: false, reason: "NOT_FOUND" });
    const result = await revokeCertificateAction(
      {},
      form({ certificateId: CERT, reason: "Fraude avérée" }),
    );
    expect(result).toEqual({ error: "Ce certificat n'existe plus." });
    expect(m.revalidatePath).toHaveBeenCalledWith("/certificates");
  });

  it("says a failure under the form rather than throwing to the error page", async () => {
    m.revoke.mockRejectedValue(new Error("connection reset"));
    const result = await revokeCertificateAction(
      {},
      form({ certificateId: CERT, reason: "Fraude avérée" }),
    );
    expect(result.error).toMatch(/a échoué/u);
    expect(m.loggerError).toHaveBeenCalled();
    // Nothing changed: there is nothing to redraw.
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates no account page for an erased holder", async () => {
    m.findForConsole.mockResolvedValue({ ...ROW, userId: null });
    await revokeCertificateAction({}, form({ certificateId: CERT, reason: "Fraude avérée" }));
    expect(m.revalidatePath).toHaveBeenCalledTimes(1);
    expect(m.revalidatePath).toHaveBeenCalledWith("/certificates");
  });
});

describe("reinstateCertificateAction", () => {
  it("puts the certificate back and tells the holder which one", async () => {
    m.findForConsole.mockResolvedValue({ ...ROW, revokedAt: new Date(), revokedReason: "Erreur" });
    const result = await reinstateCertificateAction({}, form({ certificateId: CERT }));
    expect(result).toEqual({ ok: true });
    expect(m.reinstate).toHaveBeenCalledWith({
      id: CERT,
      actorId: "admin-1",
      notice: expect.objectContaining({
        title: "Certificat rétabli : Réseau : les fondamentaux",
        actionUrl: "/profile?tab=certificats",
      }) as unknown,
      metadata: { code: "CL-2026-1A2B3C4D", pathTitle: "Réseau : les fondamentaux" },
    });
  });

  it("says so when the certificate is not revoked, and redraws the row as it now stands", async () => {
    m.reinstate.mockResolvedValue({ ok: false, reason: "NOT_REVOKED" });
    const result = await reinstateCertificateAction({}, form({ certificateId: CERT }));
    expect(result).toEqual({ error: "Ce certificat n'est pas révoqué." });
    expect(m.revalidatePath).toHaveBeenCalledWith("/certificates");
    expect(m.revalidatePath).toHaveBeenCalledWith(`/users/${HOLDER}`);
  });

  it("says so when the certificate is gone, and drops it from the list", async () => {
    m.findForConsole.mockResolvedValue(null);
    const result = await reinstateCertificateAction({}, form({ certificateId: CERT }));
    expect(result).toEqual({ error: "Ce certificat n'existe plus." });
    expect(m.reinstate).not.toHaveBeenCalled();
    expect(m.revalidatePath).toHaveBeenCalledWith("/certificates");
  });

  it("ignores which form sent it: the intent field is not part of the input", async () => {
    m.findForConsole.mockResolvedValue({ ...ROW, revokedAt: new Date(), revokedReason: "Erreur" });
    const result = await reinstateCertificateAction(
      {},
      form({ intent: "reinstate", certificateId: CERT }),
    );
    expect(result).toEqual({ ok: true });
  });

  it("refuses an id that is not one", async () => {
    const result = await reinstateCertificateAction({}, form({ certificateId: "nope" }));
    expect(result).toEqual({ error: "Paramètres invalides." });
    expect(m.findForConsole).not.toHaveBeenCalled();
  });
});
