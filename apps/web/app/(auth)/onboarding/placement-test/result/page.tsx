import Link from "next/link";
import type { SearchParams } from "next/dist/server/request/search-params";

interface ResultPageProps {
  searchParams: Promise<SearchParams>;
}

export default async function PlacementResultPage({ searchParams }: ResultPageProps) {
  const params = await searchParams;

  const devScore = Number(params["dev"] ?? 0);
  const cybersecScore = Number(params["cybersec"] ?? 0);
  const networkScore = Number(params["network"] ?? 0);
  const recommendedPath = params["path"] as string | undefined;

  const hasRecommendation = typeof recommendedPath === "string" && recommendedPath.length > 0;

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--color-bg-base)" }}
    >
      <div className="w-full max-w-lg space-y-8 text-center">
        <div>
          <div className="text-5xl mb-4">🎯</div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Test terminé !
          </h1>
          <p className="mt-2" style={{ color: "var(--color-text-secondary)" }}>
            Voici vos résultats par domaine.
          </p>
        </div>

        {/* Score grid */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Dev", score: devScore },
            { label: "Cybersec", score: cybersecScore },
            { label: "Réseaux", score: networkScore },
          ].map(({ label, score }) => (
            <div
              key={label}
              className="rounded-xl p-4 space-y-2"
              style={{
                backgroundColor: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border-default)",
              }}
            >
              <div
                className="text-2xl font-bold"
                style={{
                  color: score >= 70 ? "var(--color-success)" : "var(--color-text-primary)",
                }}
              >
                {score}%
              </div>
              <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Recommendation */}
        {hasRecommendation ? (
          <div
            className="rounded-xl p-6 space-y-4 text-left"
            style={{
              backgroundColor: "var(--color-bg-elevated)",
              border: "1px solid var(--color-brand-turquoise)",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--color-brand-turquoise)" }}>
              Recommandation
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Sur la base de vos résultats, nous vous recommandons de commencer par ce parcours. Les
              prérequis des niveaux débutant et intermédiaire dans vos domaines maîtrisés ont été
              débloqués automatiquement.
            </p>
            <Link
              href={`/paths/${recommendedPath}`}
              className="inline-block rounded-lg px-4 py-2.5 text-sm font-semibold"
              style={{ backgroundColor: "var(--color-brand-blue)", color: "#ffffff" }}
            >
              Voir le parcours recommandé →
            </Link>
          </div>
        ) : (
          <div
            className="rounded-xl p-6 text-left"
            style={{
              backgroundColor: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Vous débutez sur ces sujets — c&apos;est le bon moment pour commencer depuis les
              bases. Explorez nos parcours pour trouver votre point d&apos;entrée.
            </p>
          </div>
        )}

        <Link
          href="/dashboard"
          className="inline-block text-sm"
          style={{ color: "var(--color-brand-turquoise)" }}
        >
          Aller au tableau de bord →
        </Link>
      </div>
    </main>
  );
}
