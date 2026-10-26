import type { Prisma } from "@prisma/client";
import {
  parseCertificateReference,
  publicIdPrefixRange,
} from "@cyberlearn/lib/social/certificate-code";
import { AUDIT_ACTION } from "../audit-actions.js";
import { prisma } from "../prisma.js";
import { readSlice, type ConsolePage, type ConsoleSlice, type SortDir } from "./console-page.js";

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

// ─── Console ────────────────────────────────────────────────────────────────

/** The audit actions the console writes on a certificate. */
export const CERTIFICATE_AUDIT_ACTION = AUDIT_ACTION.certificate;

/** A certificate's state in the console's list: still valid, or revoked. */
export type ConsoleCertificateStatus = "active" | "revoked";

/** The columns the console's certificate list sorts by. */
export type ConsoleCertificateSort = "holder" | "path" | "score" | "issued";

export interface ConsoleCertificateQuery extends ConsolePage {
  /**
   * A name, a @pseudo, an address, a path's title, or a certificate's number
   * ("CL-2026-1A2B3C4D", its public id, its verification address); empty for none.
   */
  q: string;
  pathId: string | undefined;
  status: ConsoleCertificateStatus | undefined;
  sort: { key: ConsoleCertificateSort; dir: SortDir };
}

const CONSOLE_CERTIFICATE_ROW = {
  id: true,
  publicId: true,
  userId: true,
  holderName: true,
  issuedAt: true,
  score: true,
  revokedAt: true,
  revokedReason: true,
  user: { select: { username: true, displayName: true, email: true } },
  path: { select: { id: true, title: true } },
} as const satisfies Prisma.CertificateSelect;

export type ConsoleCertificateRow = Prisma.CertificateGetPayload<{
  select: typeof CONSOLE_CERTIFICATE_ROW;
}>;

/** What the console's actions read of a certificate before acting on it. */
const CONSOLE_CERTIFICATE_DETAIL = {
  id: true,
  publicId: true,
  userId: true,
  holderName: true,
  issuedAt: true,
  revokedAt: true,
  revokedReason: true,
  path: { select: { title: true } },
} as const satisfies Prisma.CertificateSelect;

export type ConsoleCertificateDetail = Prisma.CertificateGetPayload<{
  select: typeof CONSOLE_CERTIFICATE_DETAIL;
}>;

/** The notice the holder receives, written by the caller in the product's words. */
export interface CertificateNotice {
  title: string;
  body: string;
  actionUrl: string;
}

export type RevokeCertificateResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" | "ALREADY_REVOKED" };

export type ReinstateCertificateResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" | "NOT_REVOKED" };

/**
 * The order of each sortable column. The id comes last everywhere, so rows
 * that tie (two certificates issued the same second, two without a score)
 * keep their places from one page to the next.
 */
function consoleCertificateOrder(
  key: ConsoleCertificateSort,
  dir: SortDir,
): Prisma.CertificateOrderByWithRelationInput[] {
  const tieBreak: Prisma.CertificateOrderByWithRelationInput = { id: "asc" };
  switch (key) {
    case "holder":
      // The name printed on the certificate, which is the one the list shows.
      return [{ holderName: { sort: dir, nulls: "last" } }, tieBreak];
    case "path":
      return [{ path: { title: dir } }, { issuedAt: "desc" }, tieBreak];
    case "score":
      // A path without a final exam issues certificates without a score.
      return [{ score: { sort: dir, nulls: "last" } }, tieBreak];
    case "issued":
      return [{ issuedAt: dir }, tieBreak];
  }
}

/** The first and the last instant of a year, in UTC like the year a number prints. */
function yearRange(year: number): { gte: Date; lt: Date } {
  return { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };
}

/**
 * The certificates a console search matches.
 *
 * Text matches the name printed on the certificate, the holder's account
 * (display name, handle without its @, address) and the path's title. A
 * certificate's number matches the certificate itself: a support request
 * quotes the "CL-2026-1A2B3C4D" of the PDF, or the address of its
 * verification page, and either finds the one row.
 */
export function consoleCertificateWhere(
  q: string,
  pathId: string | undefined,
  status: ConsoleCertificateStatus | undefined,
): Prisma.CertificateWhereInput {
  const terms: Prisma.CertificateWhereInput[] = [];
  if (pathId !== undefined) terms.push({ pathId });
  if (status === "active") terms.push({ revokedAt: null });
  if (status === "revoked") terms.push({ revokedAt: { not: null } });

  const trimmed = q.trim();
  if (trimmed !== "") {
    const term = trimmed.replace(/^@/u, "");
    const either: Prisma.CertificateWhereInput[] = [
      { holderName: { contains: term, mode: "insensitive" } },
      { user: { is: { displayName: { contains: term, mode: "insensitive" } } } },
      { user: { is: { username: { contains: term, mode: "insensitive" } } } },
      { user: { is: { email: { contains: term, mode: "insensitive" } } } },
      { path: { title: { contains: term, mode: "insensitive" } } },
    ];
    const reference = parseCertificateReference(trimmed);
    if (reference?.kind === "publicId") {
      either.unshift({ publicId: reference.publicId });
    } else if (reference?.kind === "prefix") {
      either.unshift({
        publicId: publicIdPrefixRange(reference.prefix),
        ...(reference.year !== null ? { issuedAt: yearRange(reference.year) } : {}),
      });
    }
    terms.push({ OR: either });
  }
  return { AND: terms };
}

const MONTH_MS = 30 * 86_400_000;

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

  /**
   * Every certificate of an account, the revoked ones included, for its page
   * in the console. findByUser leaves the revoked out: the holder has nothing
   * to do with them, support needs to see them.
   */
  async findAllForConsole(userId: string) {
    return prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: "desc" },
      select: {
        id: true,
        publicId: true,
        issuedAt: true,
        score: true,
        revokedAt: true,
        revokedReason: true,
        path: { select: { title: true, slug: true } },
      },
    });
  },

  /**
   * Every certificate of an account, the revoked ones included, newest
   * first: the profile's Certificats tab, which shows a revoked one with its
   * reason rather than dropping it.
   */
  async listForUser(userId: string) {
    return prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: "desc" },
      select: {
        id: true,
        publicId: true,
        issuedAt: true,
        score: true,
        sha256Hash: true,
        revokedAt: true,
        revokedReason: true,
        path: {
          select: { title: true, category: true, difficulty: true, estimatedHours: true },
        },
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

  /** One page of the console's certificate list, under its search and filters. */
  async listForConsole(
    query: ConsoleCertificateQuery,
  ): Promise<ConsoleSlice<ConsoleCertificateRow>> {
    const where = consoleCertificateWhere(query.q, query.pathId, query.status);
    return readSlice(
      query,
      () => prisma.certificate.count({ where }),
      ({ skip, take }) =>
        prisma.certificate.findMany({
          where,
          orderBy: consoleCertificateOrder(query.sort.key, query.sort.dir),
          skip,
          take,
          select: CONSOLE_CERTIFICATE_ROW,
        }),
    );
  },

  /** The figures above the certificate list, over every certificate whatever the filter. */
  async consoleCounts(
    now: Date,
  ): Promise<{ total: number; active: number; revoked: number; lastMonth: number }> {
    const [total, revoked, lastMonth] = await Promise.all([
      prisma.certificate.count(),
      prisma.certificate.count({ where: { revokedAt: { not: null } } }),
      prisma.certificate.count({
        where: { issuedAt: { gte: new Date(now.getTime() - MONTH_MS) } },
      }),
    ]);
    return { total, active: total - revoked, revoked, lastMonth };
  },

  /** The paths that have issued a certificate, for the list's path filter. */
  async consolePathOptions(): Promise<{ id: string; title: string }[]> {
    return prisma.path.findMany({
      where: { certificates: { some: {} } },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
  },

  /** A certificate as the console's actions need it, or null. */
  async findForConsole(id: string): Promise<ConsoleCertificateDetail | null> {
    return prisma.certificate.findUnique({ where: { id }, select: CONSOLE_CERTIFICATE_DETAIL });
  },

  /**
   * Revokes a certificate, with its reason: the verification page then says so
   * to anyone, and the PDF is no longer handed out.
   *
   * The write requires the certificate to be valid still, in the statement
   * itself: revoking twice (a double click, two administrators) changes
   * nothing the second time, neither the reason nor the date, and writes no
   * second audit row or notice. The audit row and the holder's notice are
   * written in the same transaction, so a revocation never goes untraced or
   * unannounced, and a failed one announces nothing.
   *
   * The path stays COMPLETED and linked to the certificate: the holder did
   * finish it, and reinstate() can put the same certificate back.
   */
  async revoke(input: {
    id: string;
    reason: string;
    actorId: string;
    now: Date;
    /** For the holder; an erased account's certificate has nobody to tell. */
    notice: CertificateNotice;
    metadata?: Record<string, string | number | null>;
  }): Promise<RevokeCertificateResult> {
    return prisma.$transaction(async (tx): Promise<RevokeCertificateResult> => {
      const written = await tx.certificate.updateMany({
        where: { id: input.id, revokedAt: null },
        data: { revokedAt: input.now, revokedReason: input.reason },
      });
      if (written.count === 0) {
        const exists = await tx.certificate.findUnique({
          where: { id: input.id },
          select: { id: true },
        });
        return { ok: false, reason: exists === null ? "NOT_FOUND" : "ALREADY_REVOKED" };
      }

      const cert = await tx.certificate.findUniqueOrThrow({
        where: { id: input.id },
        select: { userId: true, publicId: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: CERTIFICATE_AUDIT_ACTION.revoke,
          targetType: "Certificate",
          targetId: input.id,
          metadata: {
            ...input.metadata,
            publicId: cert.publicId,
            holderId: cert.userId,
            reason: input.reason,
          },
        },
      });
      if (cert.userId !== null) {
        await tx.notification.create({
          data: {
            userId: cert.userId,
            type: "CERTIFICATE_REVOKED",
            title: input.notice.title,
            body: input.notice.body,
            actionUrl: input.notice.actionUrl,
            metadata: { certId: input.id, publicId: cert.publicId },
          },
        });
      }
      return { ok: true };
    });
  },

  /**
   * Puts a revoked certificate back: valid again, under the same number and
   * with the same PDF, whose fingerprint never changed. For a revocation made
   * in error. Idempotent like revoke(): only a revoked certificate is written,
   * in the statement itself, and the audit row (with the reason it replaces)
   * and the holder's notice go in the same transaction.
   */
  async reinstate(input: {
    id: string;
    actorId: string;
    notice: CertificateNotice;
    metadata?: Record<string, string | number | null>;
  }): Promise<ReinstateCertificateResult> {
    return prisma.$transaction(async (tx): Promise<ReinstateCertificateResult> => {
      const before = await tx.certificate.findUnique({
        where: { id: input.id },
        select: { userId: true, publicId: true, revokedAt: true, revokedReason: true },
      });
      if (before === null) return { ok: false, reason: "NOT_FOUND" };

      const written = await tx.certificate.updateMany({
        where: { id: input.id, revokedAt: { not: null } },
        data: { revokedAt: null, revokedReason: null },
      });
      if (written.count === 0) return { ok: false, reason: "NOT_REVOKED" };

      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: CERTIFICATE_AUDIT_ACTION.reinstate,
          targetType: "Certificate",
          targetId: input.id,
          metadata: {
            ...input.metadata,
            publicId: before.publicId,
            holderId: before.userId,
            revokedAt: before.revokedAt?.toISOString() ?? null,
            previousReason: before.revokedReason,
          },
        },
      });
      if (before.userId !== null) {
        await tx.notification.create({
          data: {
            userId: before.userId,
            type: "CERTIFICATE_ISSUED",
            title: input.notice.title,
            body: input.notice.body,
            actionUrl: input.notice.actionUrl,
            metadata: { certId: input.id, publicId: before.publicId },
          },
        });
      }
      return { ok: true };
    });
  },

  /**
   * Every certificate issued to the account, revoked ones included, for its
   * GDPR export (rgpd/build-export.ts). The id is for the download link the
   * export builds, never printed itself.
   */
  async exportFor(userId: string) {
    return prisma.certificate.findMany({
      where: { userId },
      select: {
        id: true,
        publicId: true,
        issuedAt: true,
        expiresAt: true,
        sha256Hash: true,
        revokedAt: true,
        revokedReason: true,
        path: { select: { title: true } },
      },
    });
  },
};
