"use strict";
// @cyberlearn/db
// Prisma client, Supabase client factories, repositories, and database types.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChallengeType =
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
  exports.challengeRepository =
  exports.leaderboardRepository =
  exports.notificationRepository =
  exports.qaRepository =
  exports.ratingRepository =
  exports.certificateRepository =
  exports.pathRepository =
  exports.userRepository =
  exports.badgeRepository =
  exports.lessonRepository =
  exports.prisma =
    void 0;
var prisma_js_1 = require("./prisma.js");
Object.defineProperty(exports, "prisma", {
  enumerable: true,
  get: function () {
    return prisma_js_1.prisma;
  },
});
var lesson_repository_js_1 = require("./repositories/lesson.repository.js");
Object.defineProperty(exports, "lessonRepository", {
  enumerable: true,
  get: function () {
    return lesson_repository_js_1.lessonRepository;
  },
});
var badge_repository_js_1 = require("./repositories/badge.repository.js");
Object.defineProperty(exports, "badgeRepository", {
  enumerable: true,
  get: function () {
    return badge_repository_js_1.badgeRepository;
  },
});
var user_repository_js_1 = require("./repositories/user.repository.js");
Object.defineProperty(exports, "userRepository", {
  enumerable: true,
  get: function () {
    return user_repository_js_1.userRepository;
  },
});
var path_repository_js_1 = require("./repositories/path.repository.js");
Object.defineProperty(exports, "pathRepository", {
  enumerable: true,
  get: function () {
    return path_repository_js_1.pathRepository;
  },
});
var certificate_repository_js_1 = require("./repositories/certificate.repository.js");
Object.defineProperty(exports, "certificateRepository", {
  enumerable: true,
  get: function () {
    return certificate_repository_js_1.certificateRepository;
  },
});
var rating_repository_js_1 = require("./repositories/rating.repository.js");
Object.defineProperty(exports, "ratingRepository", {
  enumerable: true,
  get: function () {
    return rating_repository_js_1.ratingRepository;
  },
});
var qa_repository_js_1 = require("./repositories/qa.repository.js");
Object.defineProperty(exports, "qaRepository", {
  enumerable: true,
  get: function () {
    return qa_repository_js_1.qaRepository;
  },
});
var notification_repository_js_1 = require("./repositories/notification.repository.js");
Object.defineProperty(exports, "notificationRepository", {
  enumerable: true,
  get: function () {
    return notification_repository_js_1.notificationRepository;
  },
});
var leaderboard_repository_js_1 = require("./repositories/leaderboard.repository.js");
Object.defineProperty(exports, "leaderboardRepository", {
  enumerable: true,
  get: function () {
    return leaderboard_repository_js_1.leaderboardRepository;
  },
});
var challenge_repository_js_1 = require("./repositories/challenge.repository.js");
Object.defineProperty(exports, "challengeRepository", {
  enumerable: true,
  get: function () {
    return challenge_repository_js_1.challengeRepository;
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
Object.defineProperty(exports, "ChallengeType", {
  enumerable: true,
  get: function () {
    return client_1.ChallengeType;
  },
});
//# sourceMappingURL=index.js.map
