"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { userRepository, type ConsoleProfileField } from "@cyberlearn/db";
import { createSupabaseAdminClient } from "@cyberlearn/db/supabase/admin";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { uploadedAvatarKey, usernameSchema } from "@cyberlearn/types";
import { requireAdminAction } from "@/lib/auth";

/**
 * Correcting what an account shows of itself: the name, the handle, the bio,
 * the avatar. For a name that insults somebody, a bio that gives out a phone
 * number, a picture that has no place on the platform, or a learner who asks
 * for a handle they cannot change themselves.
 *
 * The bounds are the site's own (the onboarding and settings forms): the
 * console cannot write what the learner could not. Each change and its audit
 * row land in one transaction in the repository. An uploaded picture's file
 * is removed from storage after it, and a failure there is reported rather
 * than undone: the account no longer shows it either way.
 */

export interface ProfileActionState {
  ok?: boolean;
  error?: string;
  /** What was done, in a sentence, once it is done. */
  notice?: string;
  /** True when the avatar was cleared but its uploaded file is still in storage. */
  fileKept?: boolean;
}

/** The private bucket uploaded pictures live in (docs/adr/ADR-003). */
const AVATAR_BUCKET = "avatars";

/** The rule of a handle, as the site's onboarding says it. */
const USERNAME_RULE =
  "Pseudo : 3 à 32 caractères, lettres minuscules, chiffres et tirets, sans tiret au début ni à la fin.";

const profileSchema = z.object({
  userId: z.guid(),
  displayName: z
    .string()
    .trim()
    .min(1, "Indique un nom affiché.")
    .max(64, "Le nom affiché compte 64 caractères au plus."),
  // Empty only for an account still in onboarding, which has no handle yet:
  // the repository refuses it for one that has.
  username: z
    .string()
    .trim()
    .refine((value) => value === "" || usernameSchema.safeParse(value).success, USERNAME_RULE),
  bio: z.string().trim().max(280, "La bio compte 280 caractères au plus."),
});

const FIELD_LABEL: Record<ConsoleProfileField, string> = {
  displayName: "nom affiché",
  username: "pseudo",
  bio: "bio",
  avatar: "avatar",
};

/** The name, handle and bio, as the administrator typed them. */
export async function updateUserProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const admin = await requireAdminAction();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { userId, displayName, username, bio } = parsed.data;

  let result: Awaited<ReturnType<typeof userRepository.updateProfileFromConsole>>;
  try {
    result = await userRepository.updateProfileFromConsole(
      userId,
      { displayName, username: username === "" ? null : username, bio: bio === "" ? null : bio },
      { actorId: admin.id },
    );
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "updateUserProfileAction failed");
    return { error: "L'enregistrement a échoué. Rien n'a été modifié." };
  }

  if (!result.ok) {
    switch (result.reason) {
      case "NOT_FOUND":
        return { error: "Ce compte n'existe plus." };
      case "USERNAME_TAKEN":
        return { error: "Ce pseudo est déjà pris par un autre compte." };
      case "USERNAME_REQUIRED":
        return {
          error:
            "Ce compte a un pseudo et doit en garder un. Pour l'effacer, remets-le à zéro : un pseudo neutre est généré.",
        };
    }
  }
  if (result.changed.length === 0) return { ok: true, notice: "Rien n'a changé." };

  revalidatePath(`/users/${userId}`);
  const fields = result.changed.map((field) => FIELD_LABEL[field]).join(", ");
  return {
    ok: true,
    notice: result.changed.includes("username")
      ? `Profil enregistré (${fields}). L'adresse de son profil public suit le nouveau pseudo : l'ancienne ne mène plus à ce compte.`
      : `Profil enregistré (${fields}).`,
  };
}

const resetSchema = z.object({
  userId: z.guid(),
  field: z.enum(["displayName", "username", "bio", "avatar"]),
});

const RESET_UNCHANGED: Record<ConsoleProfileField, string> = {
  displayName: "Le nom affiché est déjà le pseudo.",
  username: "Rien à remettre à zéro.",
  bio: "Ce compte n'a pas de bio.",
  avatar: "Ce compte n'a pas d'avatar.",
};

/**
 * One field back to what nobody chose: the name shown becomes the handle, the
 * handle a generated one, the bio and the avatar nothing.
 */
export async function resetUserProfileFieldAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const admin = await requireAdminAction();
  const parsed = resetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Paramètres invalides." };
  const { userId, field } = parsed.data;

  let result: Awaited<ReturnType<typeof userRepository.resetProfileFieldFromConsole>>;
  try {
    result = await userRepository.resetProfileFieldFromConsole(userId, field, {
      actorId: admin.id,
    });
  } catch (error) {
    logger.error(
      { scope: "admin", err: errorMessage(error) },
      "resetUserProfileFieldAction failed",
    );
    return { error: "La remise à zéro a échoué. Rien n'a été modifié." };
  }

  if (!result.ok) {
    switch (result.reason) {
      case "NOT_FOUND":
        return { error: "Ce compte n'existe plus." };
      case "UNCHANGED":
        return { error: RESET_UNCHANGED[field] };
      case "NO_USERNAME":
        return { error: "Ce compte n'a pas encore de pseudo : son inscription n'est pas finie." };
      case "USERNAME_TAKEN":
        return { error: "Aucun pseudo libre n'a pu être généré. Réessaie." };
    }
  }

  // After the commit: the row no longer points at the file, whatever happens
  // to the file now.
  let fileKept = false;
  const key = uploadedAvatarKey(result.clearedAvatar);
  if (key !== null) {
    try {
      const { error } = await createSupabaseAdminClient().storage.from(AVATAR_BUCKET).remove([key]);
      if (error) throw new Error(error.message);
    } catch (error) {
      logger.error({ scope: "admin", err: errorMessage(error) }, "avatar file removal failed");
      fileKept = true;
    }
  }

  revalidatePath(`/users/${userId}`);
  return { ok: true, notice: resetNotice(field, result.value), fileKept };
}

function resetNotice(field: ConsoleProfileField, value: string | null): string {
  switch (field) {
    case "displayName":
      return `Nom affiché remis au pseudo : ${value ?? ""}.`;
    case "username":
      return `Nouveau pseudo : @${value ?? ""}. L'adresse de son ancien profil public ne mène plus à ce compte.`;
    case "bio":
      return "Bio effacée.";
    case "avatar":
      return "Avatar retiré. La personne peut en choisir un autre dans ses réglages.";
  }
}
