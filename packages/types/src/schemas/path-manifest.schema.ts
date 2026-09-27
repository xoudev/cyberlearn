import { z } from "zod";
import { lessonRefCodeSchema, pathRefCodeSchema } from "./ref-code.schema.js";

/**
 * A catalogue path as the repository describes it: content/paths/<slug>.json.
 *
 * The first catalogue's paths were written in seed-paths.ts, one array. The new
 * catalogue has twenty paths of up to a hundred lessons in modules
 * (docs/curriculum), which belongs with the lessons it orders, in content/,
 * checked by a schema rather than by a TypeScript literal nobody reviews.
 *
 * The lessons' order is the modules' order, then the order inside each module.
 */
export const pathModuleManifestSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(1000).optional(),
  lessons: z.array(lessonRefCodeSchema).min(1),
});

export const pathManifestSchema = z
  .object({
    refCode: pathRefCodeSchema,
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/, "Slug : lettres minuscules, chiffres et tirets uniquement")
      .min(3)
      .max(100),
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(10).max(1000),
    category: z.enum(["DEV", "CYBERSEC", "NETWORK"]),
    track: z.enum(["SKILL", "CAREER"]).default("SKILL"),
    difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
    estimatedHours: z.number().int().positive().max(500),
    modules: z.array(pathModuleManifestSchema).min(1),
  })
  .superRefine((path, ctx) => {
    const seen = new Set<string>();
    path.modules.forEach((module, m) => {
      module.lessons.forEach((refCode, l) => {
        if (seen.has(refCode)) {
          ctx.addIssue({
            code: "custom",
            path: ["modules", m, "lessons", l],
            message: `${refCode} apparaît deux fois dans le parcours.`,
          });
        }
        seen.add(refCode);
      });
    });
  });

export type PathModuleManifest = z.infer<typeof pathModuleManifestSchema>;
export type PathManifest = z.infer<typeof pathManifestSchema>;
