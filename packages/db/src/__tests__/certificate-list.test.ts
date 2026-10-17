/**
 * certificateRepository.listForUser: the profile's Certificats tab. Scoped to
 * the one account asked for, the revoked certificates kept (the tab shows
 * them with their reason), the newest first. Prisma is mocked.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { certificateRepository } from "../repositories/certificate.repository.js";

// Hoisted above the import: the repository reads the mocked client.
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { certificate: { findMany: vi.fn() } },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const USER = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.certificate.findMany.mockResolvedValue([]);
});

describe("certificateRepository.listForUser", () => {
  it("reads the account's certificates only, revoked ones included, newest first", async () => {
    await certificateRepository.listForUser(USER);

    expect(mockPrisma.certificate.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.certificate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER }, orderBy: { issuedAt: "desc" } }),
    );
  });

  it("reads what the tab shows, and not where the file is stored", async () => {
    await certificateRepository.listForUser(USER);

    expect(mockPrisma.certificate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          publicId: true,
          revokedAt: true,
          revokedReason: true,
          path: {
            select: { title: true, category: true, difficulty: true, estimatedHours: true },
          },
        }),
      }),
    );
    expect(mockPrisma.certificate.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ pdfStorageKey: expect.anything() }),
      }),
    );
  });
});
