import { describe, expect, it } from "vitest";
import { CERTIFICATE_COUNT_COLUMN, certificateCountOf, verifyPageLabel } from "../certificates";

/**
 * The home screen's "Certificats" tile read 0 for every holder: it counted on
 * a column the Data API does not grant, and read the refusal as zero.
 */

describe("the certificate count", () => {
  it("runs on a column the Data API grants a holder, not on id", () => {
    // packages/db/prisma/migrations/20260725000000_rls_column_hardening grants
    // these columns of certificates to authenticated, and no other.
    const granted = ["publicId", "userId", "pathId", "score", "issuedAt", "expiresAt", "revokedAt"];
    expect(granted).toContain(CERTIFICATE_COUNT_COLUMN);
  });

  it("is the count the request answered", () => {
    expect(certificateCountOf({ count: 3, error: null })).toBe(3);
    expect(certificateCountOf({ count: null, error: null })).toBe(0);
  });

  it("does not read a refused request as zero", () => {
    expect(() =>
      certificateCountOf({ count: null, error: { message: "permission denied for table" } }),
    ).toThrow("permission denied");
  });
});

describe("verifyPageLabel", () => {
  it("names the verification page of the site the app talks to", () => {
    expect(verifyPageLabel("https://cyberlearn.fr")).toBe("cyberlearn.fr/verify");
    expect(verifyPageLabel("http://localhost:3000/")).toBe("localhost:3000/verify");
  });
});
