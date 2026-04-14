import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@cyberlearn/lib";
import { prisma } from "@cyberlearn/db";

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();
  const authUser = await requireUser(supabase);

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { displayName: true, username: true, level: true, xpTotal: true },
  });

  return (
    <main className="min-h-screen p-8" style={{ backgroundColor: "var(--color-bg-base)" }}>
      <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
        Tableau de bord
      </h1>
      <p className="mt-2" style={{ color: "var(--color-text-secondary)" }}>
        Bienvenue, {dbUser?.displayName ?? "Utilisateur"} !
      </p>
      <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
        Phase 1 scaffold — le vrai dashboard arrive en Phase 3.
      </p>
    </main>
  );
}
