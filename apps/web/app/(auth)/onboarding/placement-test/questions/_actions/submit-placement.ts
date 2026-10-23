"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { setOnboardingComplete } from "@/lib/onboarding/finalize";
import { submitPlacementFor } from "@/lib/onboarding/placement";

export interface PlacementActionState {
  success: boolean;
  message?: string;
  recommendedPathSlug?: string | null;
  scores?: { devScore: number; cybersecScore: number; networkScore: number };
}

/**
 * Server Action: the site's end of the placement test. Reads the form's
 * `answer_<questionId>` fields, hands them to the service the app uses too
 * (@/lib/onboarding/placement), which scores them against the database and
 * grants the waivers, then ends the onboarding and shows the result.
 *
 * A second submission goes to the dashboard: the test is taken once. It ends
 * the sign-up on the way, as the first one does: a first submission that
 * stopped after storing the result (the flag is a call to Supabase Auth) would
 * otherwise leave the account with a result and no way to the dashboard.
 */
export async function submitPlacementTest(
  _prev: PlacementActionState,
  formData: FormData,
): Promise<PlacementActionState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const answers: { questionId: string; selectedOptionId: unknown }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("answer_")) {
      answers.push({ questionId: key.slice("answer_".length), selectedOptionId: value });
    }
  }

  const result = await submitPlacementFor(user.id, { answers });
  if (!result.ok) {
    if (result.reason === "taken") {
      await setOnboardingComplete(user.id);
      redirect("/dashboard");
    }
    return { success: false, message: result.error };
  }

  await setOnboardingComplete(user.id);

  const { scores, recommendedPathSlug } = result;
  redirect(
    `/onboarding/placement-test/result?dev=${scores.devScore.toString()}&cybersec=${scores.cybersecScore.toString()}&network=${scores.networkScore.toString()}&path=${recommendedPathSlug ?? ""}`,
  );
}
