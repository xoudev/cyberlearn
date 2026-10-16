import { describe, expect, it } from "vitest";
import { verifyTarget } from "../verify-target";

/**
 * The verification form took only the full identifier, and answered the
 * number and the address printed on a certificate with "Identifiant invalide".
 */

const PUBLIC_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

describe("verifyTarget", () => {
  it("opens the page of a full identifier", () => {
    expect(verifyTarget(PUBLIC_ID)).toBe(`/verify/${PUBLIC_ID}`);
    expect(verifyTarget(`#${PUBLIC_ID}`)).toBe(`/verify/${PUBLIC_ID}`);
  });

  it("opens the page of a pasted verification address", () => {
    expect(verifyTarget(`https://cyberlearn.fr/verify/${PUBLIC_ID}`)).toBe(`/verify/${PUBLIC_ID}`);
  });

  it("hands the number printed on a certificate to the page, which resolves it", () => {
    expect(verifyTarget("CL-2026-1A2B3C4D")).toBe("/verify/CL-2026-1A2B3C4D");
    expect(verifyTarget("cl-2026-1a2b3c4d")).toBe("/verify/CL-2026-1A2B3C4D");
  });

  it("hands the short address the older PDFs printed to the page", () => {
    expect(verifyTarget("cyberlearn.fr/verify/1a2b3c4d")).toBe("/verify/1a2b3c4d");
  });

  it("refuses what is no certificate reference", () => {
    expect(verifyTarget("bonjour")).toBeNull();
    expect(verifyTarget("   ")).toBeNull();
    expect(verifyTarget("CL-2026-1A2B3C")).toBeNull();
  });
});
