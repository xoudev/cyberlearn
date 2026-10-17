import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_COUNT_COLUMN,
  CERTIFICATE_LIST_COLUMNS,
  certificateCountOf,
  revocationLine,
  validCertificates,
  verifyPageLabel,
} from "../certificates";

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

describe("the profile's certificate list", () => {
  // The columns granted to a holder: 20260725000000_rls_column_hardening,
  // plus the reason from 20261017140000_certificate_revocation.
  const GRANTED = [
    "publicId",
    "userId",
    "pathId",
    "score",
    "issuedAt",
    "expiresAt",
    "revokedAt",
    "revokedReason",
  ];

  it("reads only columns the Data API grants a holder", () => {
    const own = CERTIFICATE_LIST_COLUMNS.split(",")
      .map((column) => column.trim())
      .filter((column) => !column.includes("("));
    for (const column of own) expect(GRANTED).toContain(column);
    expect(own).toContain("revokedReason");
  });

  it("counts the valid certificates only, and keeps the revoked ones listed", () => {
    const list = [
      { publicId: "a", revokedAt: null, revokedReason: null },
      { publicId: "b", revokedAt: "2026-10-17T09:00:00.000Z", revokedReason: "Fraude" },
    ];
    expect(validCertificates(list).map((c) => c.publicId)).toEqual(["a"]);
    expect(list).toHaveLength(2);
  });
});

describe("revocationLine", () => {
  const day = (iso: string): string => iso.slice(0, 10);

  it("says nothing of a valid certificate", () => {
    expect(revocationLine({ revokedAt: null, revokedReason: null }, day)).toBeNull();
  });

  it("gives the day and the reason of a revoked one", () => {
    expect(
      revocationLine(
        { revokedAt: "2026-10-17T09:00:00.000Z", revokedReason: " Examen passé par un tiers. " },
        day,
      ),
    ).toBe("Révoqué le 2026-10-17 · Examen passé par un tiers.");
  });

  it("gives the day alone when no reason was kept", () => {
    expect(
      revocationLine({ revokedAt: "2026-10-17T09:00:00.000Z", revokedReason: null }, day),
    ).toBe("Révoqué le 2026-10-17");
  });
});

describe("verifyPageLabel", () => {
  it("names the verification page of the site the app talks to", () => {
    expect(verifyPageLabel("https://cyberlearn.fr")).toBe("cyberlearn.fr/verify");
    expect(verifyPageLabel("http://localhost:3000/")).toBe("localhost:3000/verify");
  });
});
