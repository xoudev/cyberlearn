import { describe, expect, it } from "vitest";
import { certificateFilename } from "../filename";

/**
 * The PDF downloaded as "CyberLearn - Rseaux.pdf": the filter dropped every
 * accented letter instead of taking the accent off.
 */

describe("certificateFilename", () => {
  it("keeps the letters an accent sat on", () => {
    expect(certificateFilename("Réseaux")).toBe("CyberLearn - Reseaux.pdf");
    expect(certificateFilename("Sécurité à l’ère du cloud")).toBe(
      "CyberLearn - Securite a l ere du cloud.pdf",
    );
  });

  it("keeps the words an apostrophe joins apart", () => {
    expect(certificateFilename("Fondamentaux de l'informatique")).toBe(
      "CyberLearn - Fondamentaux de l informatique.pdf",
    );
  });

  it("turns what a file name cannot hold into a single space", () => {
    expect(certificateFilename("Python : des bases à la pratique")).toBe(
      "CyberLearn - Python des bases a la pratique.pdf",
    );
    expect(certificateFilename('Linux / "bash" ?')).toBe("CyberLearn - Linux bash.pdf");
  });

  it("leaves only what the signed URL carries unescaped", () => {
    const name = certificateFilename("Œuvre d’art : ça ½ marche ? « oui »");
    // URLSearchParams leaves letters, digits, "-", "_", "." and the space
    // ("+") as they are; anything else would reach the file name as "%xx".
    expect(new URLSearchParams({ download: name }).toString()).not.toContain("%");
  });

  it("caps the title, and falls back when nothing is left of it", () => {
    expect(certificateFilename("a".repeat(120))).toBe(`CyberLearn - ${"a".repeat(80)}.pdf`);
    expect(certificateFilename("🔐 !!")).toBe("CyberLearn - Certificate.pdf");
  });
});
