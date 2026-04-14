import { prisma } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "./_components/onboarding-form";

export default async function OnboardingPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // If already onboarded, send to dashboard
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { username: true, displayName: true, avatarUrl: true },
  });

  if (dbUser?.username) {
    redirect("/dashboard");
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--color-bg-base)" }}
    >
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Bienvenue sur Cyber Learn !
          </h1>
          <p className="mt-2" style={{ color: "var(--color-text-secondary)" }}>
            Choisissez votre nom d&apos;utilisateur pour commencer.
          </p>
        </div>

        <OnboardingForm
          initialDisplayName={dbUser?.displayName ?? ""}
          avatarUrl={dbUser?.avatarUrl ?? null}
        />
      </div>
    </main>
  );
}
