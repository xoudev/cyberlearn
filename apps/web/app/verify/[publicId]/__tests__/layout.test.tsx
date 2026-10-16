import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The verification page's layout decides the response before the skeleton
 * (loading.tsx) opens its Suspense boundary: a 404 for a certificate that does
 * not exist, a redirect from the short address printed on a PDF to the full
 * one. From the page alone, both came after a 200 had gone out.
 */

const findByPublicId = vi.fn();
const findByPublicIdPrefix = vi.fn();
vi.mock("@cyberlearn/db", () => ({
  certificateRepository: { findByPublicId, findByPublicIdPrefix },
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));

const { default: CertificateLayout } = await import("../layout");

const PUBLIC_ID = "22222222-2222-4222-8222-222222222222";

function open(segment: string): Promise<unknown> {
  return CertificateLayout({ children: "page", params: Promise.resolve({ publicId: segment }) });
}

beforeEach(() => {
  findByPublicId.mockReset();
  findByPublicIdPrefix.mockReset();
  findByPublicId.mockResolvedValue(null);
  findByPublicIdPrefix.mockResolvedValue([]);
});

describe("the verification page's layout", () => {
  it("lets a certificate that exists through to the page", async () => {
    findByPublicId.mockResolvedValue({ publicId: PUBLIC_ID });
    await expect(open(PUBLIC_ID)).resolves.toBeTruthy();
    expect(findByPublicId).toHaveBeenCalledWith(PUBLIC_ID);
  });

  it("answers an unknown certificate with a 404, before the page streams", async () => {
    await expect(open(PUBLIC_ID)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("answers what is no reference at all with a 404, without a query", async () => {
    await expect(open("pas-un-certificat")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(findByPublicId).not.toHaveBeenCalled();
    expect(findByPublicIdPrefix).not.toHaveBeenCalled();
  });

  it("sends the address cut to eight characters on to the full one", async () => {
    findByPublicIdPrefix.mockResolvedValue([
      { publicId: PUBLIC_ID, issuedAt: new Date("2026-09-20T10:00:00Z") },
    ]);
    await expect(open("22222222")).rejects.toThrow(`NEXT_REDIRECT /verify/${PUBLIC_ID}`);
    expect(findByPublicIdPrefix).toHaveBeenCalledWith("22222222");
  });

  it("sends the number printed on the PDF on to the full address", async () => {
    findByPublicIdPrefix.mockResolvedValue([
      { publicId: PUBLIC_ID, issuedAt: new Date("2026-09-20T10:00:00Z") },
    ]);
    await expect(open("CL-2026-22222222")).rejects.toThrow(`NEXT_REDIRECT /verify/${PUBLIC_ID}`);
    expect(findByPublicIdPrefix).toHaveBeenCalledWith("22222222");
  });

  it("does not look up a number under eight characters", async () => {
    // Six would leave few enough values to try them all and list the holders.
    await expect(open("CL-2026-222222")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(findByPublicIdPrefix).not.toHaveBeenCalled();
  });

  it("does not vouch for a number whose year is not the certificate's", async () => {
    findByPublicIdPrefix.mockResolvedValue([
      { publicId: PUBLIC_ID, issuedAt: new Date("2026-09-20T10:00:00Z") },
    ]);
    await expect(open("CL-2025-22222222")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("answers a short number two certificates share with a 404", async () => {
    findByPublicIdPrefix.mockResolvedValue([
      { publicId: PUBLIC_ID, issuedAt: new Date("2026-09-20T10:00:00Z") },
      { publicId: "22222222-9999-4999-8999-999999999999", issuedAt: new Date("2026-03-01") },
    ]);
    await expect(open("22222222")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("sends an id in capitals on to its canonical address", async () => {
    const lettered = "abcdef12-3456-4789-8abc-def123456789";
    await expect(open(lettered.toUpperCase())).rejects.toThrow(`NEXT_REDIRECT /verify/${lettered}`);
  });
});
