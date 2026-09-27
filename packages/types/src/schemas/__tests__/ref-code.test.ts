import { describe, expect, it } from "vitest";
import { lessonRefCodeSchema, pathRefCodeSchema } from "../ref-code.schema";
import { importLessonMetadataSchema } from "../import.schema";

describe("lesson refCodes", () => {
  it("accepts the first catalogue's three digits and the new catalogue's five", () => {
    expect(lessonRefCodeSchema.safeParse("CL-LSN-085-V01").success).toBe(true);
    expect(lessonRefCodeSchema.safeParse("CL-LSN-02041-V01").success).toBe(true);
  });

  it("refuses every other shape", () => {
    for (const bad of ["CL-LSN-85-V01", "CL-LSN-0850-V01", "CL-LSN-020410-V01", "CL-LSN-085-V1"]) {
      expect(lessonRefCodeSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("is what an imported lesson and its prerequisites are checked against", () => {
    const parsed = importLessonMetadataSchema.safeParse({
      refCode: "CL-LSN-02002-V01",
      slug: "linux-le-shell",
      title: "Le shell et le terminal",
      description: "Ce qui se passe quand on tape une commande.",
      category: "DEV",
      difficulty: "BEGINNER",
      estimatedMinutes: 40,
      xpReward: 300,
      prerequisites: ["CL-LSN-02001-V01", "CL-LSN-049-V01"],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("path refCodes", () => {
  it("keeps three digits", () => {
    expect(pathRefCodeSchema.safeParse("CL-PATH-102-V01").success).toBe(true);
    expect(pathRefCodeSchema.safeParse("CL-PATH-0102-V01").success).toBe(false);
  });
});
