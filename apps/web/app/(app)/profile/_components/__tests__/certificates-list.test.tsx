// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CertificatesList, type CertificateRow } from "../certificates-list";

/**
 * The profile's Certificats tab, which took over the /certificates page:
 * every certificate, the revoked ones kept with their reason and no way to
 * the file, and the PDF of a valid one through a plain link.
 */

function cert(n: number, overrides: Partial<CertificateRow> = {}): CertificateRow {
  return {
    id: `0000000${String(n)}-1111-4111-8111-111111111111`,
    publicId: `aaaaaaa${String(n)}-2222-4222-8222-222222222222`,
    issuedAt: new Date("2026-10-01T10:00:00Z"),
    score: 85,
    sha256Hash: "ab12".repeat(16),
    revokedAt: null,
    revokedReason: null,
    path: {
      title: `Parcours ${String(n)}`,
      category: "NETWORK",
      difficulty: "BEGINNER",
      estimatedHours: 6,
    },
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("CertificatesList", () => {
  it("lists every certificate, a revoked one with its reason and without its file", () => {
    render(
      <CertificatesList
        certs={[
          cert(1),
          cert(2, {
            revokedAt: new Date("2026-10-05T10:00:00Z"),
            revokedReason: "Examen passé par un tiers",
          }),
        ]}
      />,
    );

    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("1 certificat délivré.");
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Parcours 1", "Parcours 2"]);

    const revoked = screen.getByText("Parcours 2").closest("article");
    expect(revoked).not.toBeNull();
    if (revoked === null) return;
    expect(within(revoked).getByText("Révoqué")).toBeTruthy();
    expect(within(revoked).getByText("Examen passé par un tiers")).toBeTruthy();
    expect(within(revoked).queryByRole("link")).toBeNull();
  });

  it("downloads the PDF through a plain link rather than the router, and verifies it", () => {
    render(<CertificatesList certs={[cert(1)]} />);
    const download = screen.getByRole("link", { name: /Télécharger PDF/ });
    expect(download.getAttribute("href")).toBe(`/api/certificates/${cert(1).id}/download`);
    expect(download.hasAttribute("download")).toBe(true);
    expect(screen.getByRole("link", { name: /Vérifier/ }).getAttribute("href")).toBe(
      `/verify/${cert(1).publicId}`,
    );
  });

  it("leads to the paths when there is none yet", () => {
    render(<CertificatesList certs={[]} />);
    expect(screen.getByText("Aucun certificat pour l'instant")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Explorer les parcours/ }).getAttribute("href")).toBe(
      "/paths",
    );
  });
});
