import { publicIdPrefixRange } from "@cyberlearn/lib/social/certificate-code";
import { prisma } from "../prisma.js";

export interface CreateCertificateInput {
  /** Caller-supplied so the storage key can be built before the row exists. */
  id?: string;
  /** Caller-supplied so the QR code can be rendered before the row exists. */
  publicId?: string;
  userId: string;
  pathId: string;
  /**
   * The name printed on the PDF. The verification page shows this one, not
   * the account's current name, which its holder may change at will.
   */
  holderName: string;
  /** The path's lesson count printed on the PDF ("Missions"). */
  lessonCount: number;
  issuedAt?: Date;
  sha256Hash: string;
  pdfStorageKey: string;
  expiresAt?: Date;
  /** Final quiz score (%) at issuance. Omitted for paths without a quiz (stays null). */
  score?: number;
  /** Snapshot of the quiz pass threshold at issuance. */
  passThreshold?: number;
}

/**
 * How many certificates sharing a prefix are read back to settle which one a
 * short number designates: two already say it is ambiguous without a year, a
 * few more let the year settle it.
 */
const PREFIX_CANDIDATES = 10;

export const certificateRepository = {
  async create(data: CreateCertificateInput) {
    return prisma.certificate.create({ data });
  },

  /** What the public verification page shows of a certificate. */
  async findByPublicId(publicId: string) {
    return prisma.certificate.findUnique({
      where: { publicId },
      select: {
        id: true,
        publicId: true,
        userId: true,
        holderName: true,
        issuedAt: true,
        expiresAt: true,
        score: true,
        lessonCount: true,
        sha256Hash: true,
        revokedAt: true,
        revokedReason: true,
        user: { select: { displayName: true, username: true } },
        path: { select: { title: true, _count: { select: { lessons: true } } } },
      },
    });
  },

  /**
   * The certificates whose public id starts with a prefix (8 hex characters),
   * for the short numbers printed on the PDFs. A range on the
   * unique index: the uuid column takes no LIKE.
   */
  async findByPublicIdPrefix(prefix: string) {
    return prisma.certificate.findMany({
      where: { publicId: publicIdPrefixRange(prefix) },
      select: { publicId: true, issuedAt: true },
      orderBy: { publicId: "asc" },
      take: PREFIX_CANDIDATES,
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
