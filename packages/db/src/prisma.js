"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
function createPrismaClient() {
  return new client_1.PrismaClient({
    log: ["warn", "error"],
  });
}
exports.prisma = globalThis.__prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = exports.prisma;
}
//# sourceMappingURL=prisma.js.map
