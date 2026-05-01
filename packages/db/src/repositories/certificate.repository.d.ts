export interface CreateCertificateInput {
  userId: string;
  pathId: string;
  sha256Hash: string;
  pdfStorageKey: string;
  expiresAt?: Date;
}
export declare const certificateRepository: {
  create(data: CreateCertificateInput): Promise<{
    id: string;
    userId: string;
    pathId: string;
    publicId: string;
    issuedAt: Date;
    expiresAt: Date | null;
    sha256Hash: string;
    pdfStorageKey: string;
    revokedAt: Date | null;
    revokedReason: string | null;
  }>;
  findByPublicId(publicId: string): Promise<
    | ({
        user: {
          username: string | null;
          displayName: string;
        };
        path: {
          title: string;
          category: import("@prisma/client").$Enums.Category;
          difficulty: import("@prisma/client").$Enums.Difficulty;
        };
      } & {
        id: string;
        userId: string;
        pathId: string;
        publicId: string;
        issuedAt: Date;
        expiresAt: Date | null;
        sha256Hash: string;
        pdfStorageKey: string;
        revokedAt: Date | null;
        revokedReason: string | null;
      })
    | null
  >;
  findByUser(userId: string): Promise<
    ({
      path: {
        title: string;
        category: import("@prisma/client").$Enums.Category;
        slug: string;
      };
    } & {
      id: string;
      userId: string;
      pathId: string;
      publicId: string;
      issuedAt: Date;
      expiresAt: Date | null;
      sha256Hash: string;
      pdfStorageKey: string;
      revokedAt: Date | null;
      revokedReason: string | null;
    })[]
  >;
};
//# sourceMappingURL=certificate.repository.d.ts.map
