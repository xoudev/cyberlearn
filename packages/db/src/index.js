"use strict";
// @cyberlearn/db
// Prisma client, Supabase client factories, and database types.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketStatus =
  exports.TicketTheme =
  exports.NotificationType =
  exports.ProgressStatus =
  exports.BadgeCriterionType =
  exports.BadgeRarity =
  exports.ContentStatus =
  exports.Difficulty =
  exports.Category =
  exports.UserRole =
  exports.createSupabaseAdminClient =
  exports.createSupabaseBrowserClient =
  exports.createSupabaseServerClient =
  exports.prisma =
    void 0;
var prisma_js_1 = require("./prisma.js");
Object.defineProperty(exports, "prisma", {
  enumerable: true,
  get: function () {
    return prisma_js_1.prisma;
  },
});
var server_js_1 = require("./supabase/server.js");
Object.defineProperty(exports, "createSupabaseServerClient", {
  enumerable: true,
  get: function () {
    return server_js_1.createSupabaseServerClient;
  },
});
var client_js_1 = require("./supabase/client.js");
Object.defineProperty(exports, "createSupabaseBrowserClient", {
  enumerable: true,
  get: function () {
    return client_js_1.createSupabaseBrowserClient;
  },
});
var admin_js_1 = require("./supabase/admin.js");
Object.defineProperty(exports, "createSupabaseAdminClient", {
  enumerable: true,
  get: function () {
    return admin_js_1.createSupabaseAdminClient;
  },
});
var client_1 = require("@prisma/client");
Object.defineProperty(exports, "UserRole", {
  enumerable: true,
  get: function () {
    return client_1.UserRole;
  },
});
Object.defineProperty(exports, "Category", {
  enumerable: true,
  get: function () {
    return client_1.Category;
  },
});
Object.defineProperty(exports, "Difficulty", {
  enumerable: true,
  get: function () {
    return client_1.Difficulty;
  },
});
Object.defineProperty(exports, "ContentStatus", {
  enumerable: true,
  get: function () {
    return client_1.ContentStatus;
  },
});
Object.defineProperty(exports, "BadgeRarity", {
  enumerable: true,
  get: function () {
    return client_1.BadgeRarity;
  },
});
Object.defineProperty(exports, "BadgeCriterionType", {
  enumerable: true,
  get: function () {
    return client_1.BadgeCriterionType;
  },
});
Object.defineProperty(exports, "ProgressStatus", {
  enumerable: true,
  get: function () {
    return client_1.ProgressStatus;
  },
});
Object.defineProperty(exports, "NotificationType", {
  enumerable: true,
  get: function () {
    return client_1.NotificationType;
  },
});
Object.defineProperty(exports, "TicketTheme", {
  enumerable: true,
  get: function () {
    return client_1.TicketTheme;
  },
});
Object.defineProperty(exports, "TicketStatus", {
  enumerable: true,
  get: function () {
    return client_1.TicketStatus;
  },
});
//# sourceMappingURL=index.js.map
