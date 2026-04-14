import { prisma } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlacementTestForm } from "./_components/placement-test-form";

export default async function PlacementTestPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // If already submitted, skip to dashboard
  const existing = await prisma.userPlacementResult.findUnique({
    where: { userId: user.id },
  });
  if (existing) redirect("/dashboard");

  // Fetch active questions — correctOptionId is NOT selected (server-side only)
  const questions = await prisma.placementQuestion.findMany({
    where: { isActive: true },
    select: {
      id: true,
      category: true,
      difficulty: true,
      question: true,
      options: true,
      explanation: true,
      orderIndex: true,
    },
    orderBy: [{ category: "asc" }, { orderIndex: "asc" }],
  });

  if (questions.length === 0) {
    // No questions seeded yet — skip to dashboard
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen p-4" style={{ backgroundColor: "var(--color-bg-base)" }}>
      <div className="max-w-2xl mx-auto space-y-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Test de placement
          </h1>
          <p className="mt-2" style={{ color: "var(--color-text-secondary)" }}>
            {questions.length} questions · environ 5-10 minutes
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Ce test n&apos;attribue pas de XP et ne marque aucune leçon comme terminée. Il nous aide
            uniquement à vous recommander un point de départ adapté.
          </p>
        </div>

        <PlacementTestForm questions={questions} />
      </div>
    </main>
  );
}
