// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BossNode } from "../boss-node";

// The claim button calls a server action; the certified state never shows it.
vi.mock("../claim-certificate", () => ({ ClaimCertificateButton: () => null }));
// Only what an anchor takes: a revoked certificate's node links with the router.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

/**
 * The path's final node once it is certified: the PDF comes from a route
 * handler, so its link downloads the file, as the profile's does. Once the
 * console has revoked the certificate, that download answers 404: the node
 * leads to the page that says so, with the reason.
 */

afterEach(() => {
  cleanup();
});

const CERTIFIED = {
  pathSlug: "python",
  pathTitle: "Python",
  hasQuiz: true,
  lessonsComplete: true,
  pathCompleted: true,
  certificateId: "cert-1",
  doneLessons: 10,
  totalLessons: 10,
};

describe("BossNode", () => {
  it("downloads the certificate's PDF through a plain link", () => {
    render(<BossNode {...CERTIFIED} />);
    const pdf = screen.getByRole("link", { name: /Télécharger le PDF/ });
    expect(pdf.getAttribute("href")).toBe("/api/certificates/cert-1/download");
    expect(pdf.hasAttribute("download")).toBe(true);
  });

  it("says a revoked certificate is revoked, and leads to the reason instead of the PDF", () => {
    const { container } = render(<BossNode {...CERTIFIED} certificateRevoked />);
    expect(container.textContent).toMatch(/ton certificat a été révoqué/u);
    expect(screen.queryByRole("link", { name: /Télécharger le PDF/u })).toBeNull();
    expect(screen.getByRole("link", { name: /Voir mes certificats/u }).getAttribute("href")).toBe(
      "/profile?tab=certificats",
    );
  });
});
