"use client";

import { useActionState } from "react";
import { submitPlacementTest } from "../_actions/submit-placement";
import type { PlacementActionState } from "../_actions/submit-placement";

interface PlacementOption {
  id: string;
  text: string;
}

interface PlacementQuestion {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  options: unknown;
  explanation: string | null;
  orderIndex: number;
}

interface PlacementTestFormProps {
  questions: PlacementQuestion[];
}

const CATEGORY_LABELS: Record<string, string> = {
  DEV: "Développement",
  CYBERSEC: "Cybersécurité",
  NETWORK: "Réseaux & Systèmes",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
};

const initialState: PlacementActionState = { success: false };

export function PlacementTestForm({ questions }: PlacementTestFormProps) {
  const [state, formAction, isPending] = useActionState(submitPlacementTest, initialState);

  // Group questions by category for visual separation
  const grouped = questions.reduce<Record<string, PlacementQuestion[]>>((acc, q) => {
    const cat = q.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(q);
    return acc;
  }, {});

  return (
    <form action={formAction} className="space-y-8">
      {state.message && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            backgroundColor: "rgba(255,77,109,0.1)",
            border: "1px solid var(--color-danger)",
            color: "var(--color-danger)",
          }}
          role="alert"
        >
          {state.message}
        </div>
      )}

      {Object.entries(grouped).map(([category, categoryQuestions]) => (
        <section key={category}>
          <h2
            className="text-lg font-semibold mb-4 pb-2"
            style={{
              color: "var(--color-text-primary)",
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            {CATEGORY_LABELS[category] ?? category}
          </h2>

          <div className="space-y-6">
            {categoryQuestions.map((q, index) => {
              const options = q.options as PlacementOption[];

              return (
                <fieldset
                  key={q.id}
                  className="rounded-lg p-5 space-y-3"
                  style={{
                    backgroundColor: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <legend
                    className="text-sm font-medium px-1"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    <span className="text-xs mr-2" style={{ color: "var(--color-text-muted)" }}>
                      {DIFFICULTY_LABELS[q.difficulty] ?? q.difficulty} · {index + 1}/
                      {categoryQuestions.length}
                    </span>
                    {q.question}
                  </legend>

                  <div className="space-y-2">
                    {options.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer transition-colors"
                        style={{
                          backgroundColor: "var(--color-bg-overlay)",
                          border: "1px solid var(--color-border-subtle)",
                        }}
                      >
                        <input
                          type="radio"
                          name={`answer_${q.id}`}
                          value={option.id}
                          required
                          className="shrink-0"
                          style={{ accentColor: "var(--color-brand-blue)" }}
                        />
                        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                          {option.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>
        </section>
      ))}

      <div className="flex flex-col gap-3 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-50"
          style={{ backgroundColor: "var(--color-brand-blue)", color: "#ffffff" }}
        >
          {isPending ? "Analyse en cours…" : "Valider le test"}
        </button>

        <a
          href="/dashboard"
          className="text-center text-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          Passer et aller au tableau de bord
        </a>
      </div>
    </form>
  );
}
