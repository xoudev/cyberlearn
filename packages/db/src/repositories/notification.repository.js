"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRepository = void 0;
const prisma_js_1 = require("../prisma.js");
exports.notificationRepository = {
  async findUnreadCount(userId) {
    return prisma_js_1.prisma.notification.count({
      where: { userId, readAt: null },
    });
  },
  async findByUser(userId, limit = 20) {
    return prisma_js_1.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        actionUrl: true,
        readAt: true,
        createdAt: true,
        metadata: true,
      },
    });
  },
  async markAsRead(notificationId, userId) {
    await prisma_js_1.prisma.notification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
  },
  async markAllAsRead(userId) {
    await prisma_js_1.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  },
  async create(data) {
    const notification = await prisma_js_1.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        actionUrl: data.actionUrl ?? null,
        ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
      },
      select: { id: true },
    });
    return notification.id;
  },
};
//# sourceMappingURL=notification.repository.js.map
