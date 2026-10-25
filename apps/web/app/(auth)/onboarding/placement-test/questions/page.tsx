import React from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { placementTestFor } from "@/lib/onboarding/placement";
import { PlacementTestForm } from "./_components/placement-test-form";
import { PlacementShell } from "../../_components/onboarding-shell";

export default async function PlacementQuestionsPage(): Promise<React.ReactElement> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // The questions without their answers or explanations: the same service as
  // the app's, so neither sends the browser what gives the answer away.
  const test = await placementTestFor(user.id);
  if (test.status !== "open") redirect("/dashboard");
  const { questions, estimatedMinutes } = test;

  return (
    <PlacementShell>
      <PlacementTestForm questions={questions} estimatedMinutes={estimatedMinutes} />
    </PlacementShell>
  );
}
