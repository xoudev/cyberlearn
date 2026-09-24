"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { setOnboardingComplete } from "@/lib/onboarding/finalize";
import { parseLearningAnswers, saveLearningAnswers } from "@/lib/paths/suggestions";

const destinationSchema = z.discriminatedUnion("to", [
  // A slug, nothing else: the redirect is built from it.
  z.object({
    to: z.literal("path"),
    slug: z
      .string()
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  }),
  z.object({ to: z.literal("catalogue") }),
  z.object({ to: z.literal("placement") }),
]);

/**
 * Leaves the goals step: keeps the answers, then goes where the button said.
 *
 * A suggested path or the catalogue ends the onboarding there. The placement
 * test does not: it is still part of it, and ends it when submitted, as it
 * always has.
 */
export async function finishGoals(formData: FormData): Promise<never> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const destination = destinationSchema.safeParse({
    to: formData.get("to"),
    slug: formData.get("slug") ?? undefined,
  });
  if (!destination.success) redirect("/onboarding/goals");

  const answers = parseLearningAnswers({
    goals: formData.getAll("goals"),
    level: formData.get("level"),
  });
  if (answers !== null) await saveLearningAnswers(user.id, answers);

  const to = destination.data;
  if (to.to === "placement") redirect("/onboarding/placement-test");

  await setOnboardingComplete(user.id);
  redirect(to.to === "path" ? `/paths/${to.slug}` : "/paths");
}
