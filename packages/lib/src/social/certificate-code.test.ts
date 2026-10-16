import { describe, expect, it } from "vitest";
import {
  certificateCode,
  certificateReferenceSegment,
  parseCertificateReference,
  pickCertificateByPrefix,
  publicIdPrefixRange,
} from "./certificate-code";

/**
 * One number per certificate, printed the same on the PDF, the verification
 * page and the holder's list, and every form of it the verification page
 * reads back, the short ones printed on the PDFs already issued included.
 */

const PUBLIC_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

describe("certificateCode", () => {
  it("is the year of issue and the first eight characters of the public id", () => {
    expect(certificateCode(PUBLIC_ID, new Date("2026-09-20T10:00:00Z"))).toBe("CL-2026-1A2B3C4D");
  });

  it("reads the year in UTC, like the date the PDF prints", () => {
    expect(certificateCode(PUBLIC_ID, "2026-12-31T23:30:00Z")).toBe("CL-2026-1A2B3C4D");
    expect(certificateCode(PUBLIC_ID, "2027-01-01T00:10:00+01:00")).toBe("CL-2026-1A2B3C4D");
  });
});

describe("parseCertificateReference", () => {
  it("reads the public id, whatever its case, with or without the #", () => {
    expect(parseCertificateReference(PUBLIC_ID)).toEqual({ kind: "publicId", publicId: PUBLIC_ID });
    expect(parseCertificateReference(` #${PUBLIC_ID.toUpperCase()} `)).toEqual({
      kind: "publicId",
      publicId: PUBLIC_ID,
    });
  });

  it("reads the verification address, with or without its scheme", () => {
    expect(parseCertificateReference(`https://cyberlearn.fr/verify/${PUBLIC_ID}`)).toEqual({
      kind: "publicId",
      publicId: PUBLIC_ID,
    });
    expect(parseCertificateReference(`cyberlearn.fr/verify/${PUBLIC_ID}?x=1`)).toEqual({
      kind: "publicId",
      publicId: PUBLIC_ID,
    });
  });

  it("reads the number, whatever its case", () => {
    expect(parseCertificateReference("CL-2026-1A2B3C4D")).toEqual({
      kind: "prefix",
      prefix: "1a2b3c4d",
      year: 2026,
    });
    expect(parseCertificateReference("cl-2026-1a2b3c4d")).toEqual({
      kind: "prefix",
      prefix: "1a2b3c4d",
      year: 2026,
    });
  });

  it("refuses a short form under eight characters, too few to keep holders from being listed", () => {
    // The older PDFs' number carried six: 16 million values, few enough to
    // walk through. Their address, printed under it, carries eight.
    for (const input of ["CL-2026-1A2B3C", "1a2b3c", "cyberlearn.fr/verify/1a2b3c4"]) {
      expect(parseCertificateReference(input)).toBeNull();
    }
  });

  it("reads the address the PDFs printed cut to eight characters", () => {
    expect(parseCertificateReference("cyberlearn.fr/verify/1a2b3c4d")).toEqual({
      kind: "prefix",
      prefix: "1a2b3c4d",
      year: null,
    });
    expect(parseCertificateReference("1A2B3C4D")).toEqual({
      kind: "prefix",
      prefix: "1a2b3c4d",
      year: null,
    });
  });

  it("reads the label the holder's list used to show", () => {
    expect(parseCertificateReference("CERT-1A2B3C4D")).toEqual({
      kind: "prefix",
      prefix: "1a2b3c4d",
      year: null,
    });
  });

  it("refuses anything else", () => {
    for (const input of ["", "   ", "#", "hello", "1a2b3", "CL-26-1A2B3C4D", "CL-2026-XYZ123"]) {
      expect(parseCertificateReference(input)).toBeNull();
    }
    expect(parseCertificateReference("cyberlearn.fr/verify/pas-un-id")).toBeNull();
  });
});

describe("certificateReferenceSegment", () => {
  it("opens the page on the public id, the number or the bare prefix", () => {
    expect(certificateReferenceSegment({ kind: "publicId", publicId: PUBLIC_ID })).toBe(PUBLIC_ID);
    expect(certificateReferenceSegment({ kind: "prefix", prefix: "1a2b3c4d", year: 2026 })).toBe(
      "CL-2026-1A2B3C4D",
    );
    expect(certificateReferenceSegment({ kind: "prefix", prefix: "1a2b3c4d", year: null })).toBe(
      "1a2b3c4d",
    );
  });

  it("gives a segment the page reads back as the same reference", () => {
    for (const input of [PUBLIC_ID, "CL-2026-1A2B3C4D", "cyberlearn.fr/verify/1a2b3c4d"]) {
      const reference = parseCertificateReference(input);
      expect(reference).not.toBeNull();
      if (reference === null) continue;
      expect(parseCertificateReference(certificateReferenceSegment(reference))).toEqual(reference);
    }
  });
});

describe("publicIdPrefixRange", () => {
  it("bounds every public id that starts with the prefix, and no other", () => {
    expect(publicIdPrefixRange("1A2B3C4D")).toEqual({
      gte: "1a2b3c4d-0000-0000-0000-000000000000",
      lte: "1a2b3c4d-ffff-ffff-ffff-ffffffffffff",
    });
    expect(publicIdPrefixRange("1a2b3c")).toEqual({
      gte: "1a2b3c00-0000-0000-0000-000000000000",
      lte: "1a2b3cff-ffff-ffff-ffff-ffffffffffff",
    });
    const { gte, lte } = publicIdPrefixRange("1a2b3c");
    expect(PUBLIC_ID >= gte && PUBLIC_ID <= lte).toBe(true);
    expect("1a2b3d00-0000-4000-8000-000000000000" <= lte).toBe(false);
  });
});

describe("pickCertificateByPrefix", () => {
  const a = { publicId: "1a2b3c4d-0000-4000-8000-000000000001", issuedAt: "2025-05-01T00:00:00Z" };
  const b = { publicId: "1a2b3c99-0000-4000-8000-000000000002", issuedAt: "2026-05-01T00:00:00Z" };

  it("names the only certificate that starts with the prefix", () => {
    expect(pickCertificateByPrefix([a], null)).toBe(a.publicId);
    expect(pickCertificateByPrefix([a], 2025)).toBe(a.publicId);
  });

  it("names none when nothing starts with it", () => {
    expect(pickCertificateByPrefix([], null)).toBeNull();
    expect(pickCertificateByPrefix([], 2026)).toBeNull();
  });

  it("settles between several by the number's year, and names none when it cannot", () => {
    expect(pickCertificateByPrefix([a, b], 2026)).toBe(b.publicId);
    expect(pickCertificateByPrefix([a, b], null)).toBeNull();
    expect(pickCertificateByPrefix([a, { ...b, issuedAt: a.issuedAt }], 2025)).toBeNull();
  });

  it("does not vouch for a number whose year is not the certificate's", () => {
    expect(pickCertificateByPrefix([a], 2026)).toBeNull();
  });
});
