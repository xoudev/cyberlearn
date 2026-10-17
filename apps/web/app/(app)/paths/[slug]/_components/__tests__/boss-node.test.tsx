// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BossNode } from "../boss-node";

// The claim button calls a server action; the certified state never shows it.
vi.mock("../claim-certificate", () => ({ ClaimCertificateButton: () => null }));

/**
 * The path's final node once it is certified: the PDF comes from a route
 * handler, so its link downloads the file, as the profile's does.
 */

afterEach(() => {
  cleanup();
});

describe("BossNode", () => {
  it("downloads the certificate's PDF through a plain link", () => {
    render(
      <BossNode
        pathSlug="python"
        pathTitle="Python"
        hasQuiz
        lessonsComplete
        pathCompleted
        certificateId="cert-1"
        doneLessons={10}
        totalLessons={10}
      />,
    );
    const pdf = screen.getByRole("link", { name: /Télécharger le PDF/ });
    expect(pdf.getAttribute("href")).toBe("/api/certificates/cert-1/download");
    expect(pdf.hasAttribute("download")).toBe(true);
  });
});
