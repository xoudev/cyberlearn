"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certificateRepository = void 0;
const prisma_js_1 = require("../prisma.js");
exports.certificateRepository = {
  async create(data) {
    return prisma_js_1.prisma.certificate.create({ data });
  },
  async findByPublicId(publicId) {
    return prisma_js_1.prisma.certificate.findUnique({
      where: { publicId },
      include: {
        user: { select: { displayName: true, username: true } },
        path: { select: { title: true, category: true, difficulty: true } },
      },
    });
  },
  async findByUser(userId) {
    return prisma_js_1.prisma.certificate.findMany({
      where: { userId, revokedAt: null },
      include: { path: { select: { title: true, slug: true, category: true } } },
      orderBy: { issuedAt: "desc" },
    });
  },
};
//# sourceMappingURL=certificate.repository.js.map
