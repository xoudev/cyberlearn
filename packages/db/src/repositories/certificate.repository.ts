import { prisma } from "../prisma.js";

export interface CreateCertificateInput {
  userId: string;
  pathId: string;
  sha256Hash: string;
  pdfStorageKey: string;
  expiresAt?: Date;
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
