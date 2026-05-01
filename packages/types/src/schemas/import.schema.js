"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importLessonMetadataSchema = void 0;
const zod_1 = require("zod");
exports.importLessonMetadataSchema = zod_1.z.object({
  refCode: zod_1.z.string().regex(/^CL-LSN-\d{3}-V\d{2}$/, "Format attendu: CL-LSN-XXX-VYY"),
  slug: zod_1.z
    .string()
    .regex(/^[a-z0-9-]+$/, "Slug: lettres minuscules, chiffres et tirets uniquement")
    .min(3)
    .max(100),
  title: zod_1.z.string().trim().min(3).max(200),
  description: zod_1.z.string().trim().min(10).max(500),
  category: zod_1.z.enum(["DEV", "CYBERSEC", "NETWORK"]),
  difficulty: zod_1.z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  estimatedMinutes: zod_1.z.number().int().positive().max(600),
  xpReward: zod_1.z.number().int().nonnegative().max(10000),
  coverImageUrl: zod_1.z.string().url().nullable().optional(),
  prerequisites: zod_1.z.array(zod_1.z.string().regex(/^CL-LSN-\d{3}-V\d{2}$/)).default([]),
});
//# sourceMappingURL=import.schema.js.map
