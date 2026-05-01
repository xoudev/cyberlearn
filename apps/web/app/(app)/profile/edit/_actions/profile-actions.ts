"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";

const VALID_GLYPHS = [
  "skull",
  "ghost",
  "matrix",
  "circuit",
  "bug",
  "key",
  "shield",
  "wire",
] as const;

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(64),
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_]+$/, "Lettres minuscules, chiffres et _ uniquement"),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
  avatarGlyph: z.enum(VALID_GLYPHS).optional(),
  visibility: z.enum(["public", "private"]),
  theme: z.enum(["dark", "light"]),
});

export type UpdateProfileState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof updateProfileSchema>, string>>;
};

export async function updateProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const authUser = await requireRequestUser();

  const raw = {
    displayName: formData.get("displayName"),
    username: formData.get("username"),
    bio: formData.get("bio"),
    avatarGlyph: formData.get("avatarGlyph"),
    visibility: formData.get("visibility"),
    theme: formData.get("theme"),
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: UpdateProfileState["fieldErrors"] = {};
    for (const [field, errs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      const key = field as keyof typeof fieldErrors;
      if (errs?.[0]) fieldErrors[key] = errs[0];
    }
    return { error: "Formulaire invalide.", fieldErrors };
  }

  const { displayName, username, bio, avatarGlyph, visibility, theme } = parsed.data;

  // Check username uniqueness (exclude self)
  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (existing && existing.id !== authUser.id) {
    return { error: "Cet identifiant est déjà pris.", fieldErrors: { username: "Déjà utilisé" } };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: authUser.id },
      data: {
        displayName,
        username,
        bio: bio ?? null,
        ...(avatarGlyph ? { avatarUrl: `__glyph:${avatarGlyph}` } : {}),
      },
    }),
    prisma.userPreferences.upsert({
      where: { userId: authUser.id },
      create: { userId: authUser.id, theme, publicProfile: visibility === "public" },
      update: { theme, publicProfile: visibility === "public" },
    }),
  ]);

  redirect("/profile");
}
