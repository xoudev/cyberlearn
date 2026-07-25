import { prisma } from "../prisma.js";

export interface CreateCertificateInput {
  /** Caller-supplied so the storage key can be built before the row exists. */
  id?: string;
  /** Caller-supplied so the QR code can be rendered before the row exists. */
  publicId?: string;
  userId: string;
  pathId: string;
  issuedAt?: Date;
  sha256Hash: string;
  pdfStorageKey: string;
  expiresAt?: Date;
  /** Final quiz score (%) at issuance. Omitted for paths without a quiz (stays null). */
  score?: number;
  /** Snapshot of the quiz pass threshold at issuance. */
  passThreshold?: number;
}

export const certificateRepository = {
  async create(data: CreateCertificateInput) {
    return prisma.certificate.create({ data });
  },

  async findByPublicId(publicId: string) {
    return prisma.certificate.findUnique({
      where: { publicId },
      include: {
        user: { select: { displayName: true, username: true } },
        path: { select: { title: true, category: true, difficulty: true } },
      },
    });
  },

  async findByUser(userId: string) {
    return prisma.certificate.findMany({
      where: { userId, revokedAt: null },
      include: { path: { select: { title: true, slug: true, category: true } } },
      orderBy: { issuedAt: "desc" },
    });
  },
};
