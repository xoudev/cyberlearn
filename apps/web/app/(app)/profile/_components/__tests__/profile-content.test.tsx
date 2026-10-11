// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProfileContent, type SerializedCert } from "../profile-content";

/**
 * The profile's tabs: nothing that looks like a control without being one,
 * and the certificates section leads to every certificate and to the file.
 */

function cert(n: number): SerializedCert {
  return {
    id: `0000000${String(n)}-1111-4111-8111-111111111111`,
    publicId: `public-${String(n)}`,
    pathTitle: `Parcours ${String(n)}`,
    issuedDateStr: "1 octobre 2026",
    sha256Hash: "ab12".repeat(16),
  };
}

function openCertificates(certs: SerializedCert[]): void {
  render(<ProfileContent badges={[]} lessons={[]} certs={certs} />);
  fireEvent.click(screen.getByRole("tab", { name: /Certificats/ }));
}

afterEach(() => {
  cleanup();
});

describe("ProfileContent", () => {
  it("shows no sort or view label that nothing can change", () => {
    render(<ProfileContent badges={[]} lessons={[]} certs={[]} />);
    expect(screen.queryByText(/TRIER/)).toBeNull();
    expect(screen.queryByText(/GRILLE/)).toBeNull();
  });

  it("leads from the other certificates to the list of them all", () => {
    openCertificates([cert(1), cert(2), cert(3)]);
    expect(screen.getByRole("link", { name: /\+2 autres/ }).getAttribute("href")).toBe(
      "/certificates",
    );
  });

  it("downloads the PDF through a plain link rather than the router", () => {
    openCertificates([cert(1)]);
    const download = screen.getByRole("link", { name: /Télécharger PDF/ });
    expect(download.getAttribute("href")).toBe(`/api/certificates/${cert(1).id}/download`);
    expect(download.hasAttribute("download")).toBe(true);
    expect(screen.queryByText(/autre/)).toBeNull();
  });
});
