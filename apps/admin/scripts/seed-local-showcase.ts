/** Copies the authored showcase into the disposable local catalogue; run through the .mjs loader. */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { checkLessonFile } from "../lib/services/lesson-file-check";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

async function main(): Promise<void> {
  const environment = z
    .object({
      DATABASE_URL: z.url(),
      NEXT_PUBLIC_SUPABASE_URL: z.url(),
      NODE_ENV: z.string().optional(),
    })
    .safeParse(process.env);
  if (!environment.success) throw new Error("Local database and Supabase URLs are required");
  if (environment.data.NODE_ENV === "production") {
    throw new Error("The showcase seed cannot run in production");
  }
  for (const value of [environment.data.DATABASE_URL, environment.data.NEXT_PUBLIC_SUPABASE_URL]) {
    if (!LOOPBACK.has(new URL(value).hostname)) {
      throw new Error("The showcase seed only accepts loopback database and Supabase URLs");
    }
  }

  const path = fileURLToPath(
    new URL("../../../content/lessons/_vitrine/99001-vitrine-des-composants.mdx", import.meta.url),
  );
  const file = await checkLessonFile(await readFile(path, "utf8"));
  if (!file.ok) throw new Error(file.errors.map((error) => error.message).join("\n"));
  if (
    file.metadata.refCode !== "CL-LSN-99001-V01" ||
    file.metadata.slug !== "vitrine-des-composants" ||
    file.metadata.xpReward !== 0 ||
    file.metadata.prerequisites.length > 0
  ) {
    throw new Error("Expected the standalone, zero-XP component showcase");
  }

  try {
    const author = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    if (!author) throw new Error("Seed the local administrator accounts first");

    const contentMdx = `<Callout type="info">
Copie de démonstration locale à 0 XP. Le texte d’introduction décrit la vitrine de travail, destinée à rester en brouillon. Cette copie est ajoutée uniquement au catalogue local pour essayer les composants avec le compte de test.
</Callout>\n\n${file.body}`;
    const data = {
      refCode: file.metadata.refCode,
      slug: file.metadata.slug,
      title: file.metadata.title,
      description:
        "Encadrés, quiz, code, terminaux, médias et labos : tous les composants de leçon réunis dans une démonstration locale, sans gain d’XP.",
      category: file.metadata.category,
      difficulty: file.metadata.difficulty,
      estimatedMinutes: file.metadata.estimatedMinutes,
      xpReward: 0,
      contentMdx,
      // Literal inference keeps this a Prisma enum without a type assertion.
      status: "PUBLISHED" as const,
    };
    const lesson = await prisma.lesson.upsert({
      where: { refCode: file.metadata.refCode },
      create: { ...data, authorId: author.id, publishedAt: new Date() },
      update: data,
      select: { slug: true, title: true, status: true, xpReward: true },
    });
    process.stdout.write(`${JSON.stringify(lesson)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

try {
  await main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : "Showcase seed failed");
  process.exitCode = 1;
}
