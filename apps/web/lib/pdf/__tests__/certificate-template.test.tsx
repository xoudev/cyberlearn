import React from "react";
import { describe, expect, it } from "vitest";
import { CertificateDocument } from "../certificate-template";

/**
 * What the certificate PDF prints for whoever holds it on paper: the number
 * and the address that let them check it without the QR code.
 *
 * It printed the address cut to eight characters, which the verification page
 * answered with "introuvable", and a number the page did not show.
 */

const PUBLIC_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

/** Every string in the document's tree, in order (the primitives hold no logic). */
function textOf(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return textOf(node.props.children);
  }
  return "";
}

function printed(): string {
  return textOf(
    CertificateDocument({
      displayName: "Camille Martin",
      username: "camille",
      pathTitle: "Réseaux",
      issuedAt: new Date("2026-09-20T10:00:00Z"),
      publicId: PUBLIC_ID,
      score: 86,
      lessonCount: 12,
      qrCodeDataUrl: "data:image/png;base64,AA",
      appUrl: "https://cyberlearn.fr",
    }),
  );
}

describe("the certificate PDF", () => {
  it("prints the whole verification address, the one the QR code encodes", () => {
    expect(printed()).toContain(`cyberlearn.fr/verify/${PUBLIC_ID}`);
  });

  it("prints the number the verification page shows", () => {
    expect(printed()).toContain("CL-2026-1A2B3C4D");
  });
});
