import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The public verification page of a certificate.
 *
 * It used to draw a QR code captioned "Scanner pour vérifier". The pattern was
 * generated, not encoded: scanning it led nowhere. A code on this page is
 * pointless anyway, since whoever reads it is already where it would lead.
 * The real code is on the PDF, which is what gets printed and handed over.
 */

const findUnique = vi.fn();
vi.mock("@cyberlearn/db", () => ({ prisma: { certificate: { findUnique } } }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { default: CertVerifyPage } = await import("../page");

const PUBLIC_ID = "22222222-2222-4222-8222-222222222222";
const HASH = "ab12".repeat(16);

beforeEach(() => {
  findUnique.mockReset();
  findUnique.mockResolvedValue({
    id: "11111111-1111-4111-8111-111111111111",
    publicId: PUBLIC_ID,
    holderName: "Camille Martin",
    issuedAt: new Date("2026-09-20T10:00:00Z"),
    expiresAt: null,
    score: 86,
    passThreshold: 70,
    sha256Hash: HASH,
    revokedAt: null,
    revokedReason: null,
    user: { displayName: "Camille Martin", username: "camille" },
    path: { title: "Python : des bases à la pratique", lessons: [{ lessonId: "a" }] },
  });
});

async function renderPage(): Promise<string> {
  const element = await CertVerifyPage({ params: Promise.resolve({ publicId: PUBLIC_ID }) });
  return renderToStaticMarkup(element);
}

describe("the certificate verification page", () => {
  it("shows the certificate it verifies", async () => {
    const html = await renderPage();
    expect(html).toContain("Camille Martin");
    expect(html).toContain("Python : des bases à la pratique");
    expect(html).toContain("ab12ab12ab12ab12");
  });

  it("prints the whole fingerprint, grouped, with nothing dangling", async () => {
    const html = await renderPage();
    const group = "ab12ab12ab12ab12";
    expect(html).toContain(`${group} · ${group} · ${group} · ${group}<`);
  });

  it("no longer draws a QR code nobody can scan", async () => {
    const html = await renderPage();
    expect(html).not.toContain("Scanner pour vérifier");
    expect(html.toLowerCase()).not.toContain("qr");
  });
});
