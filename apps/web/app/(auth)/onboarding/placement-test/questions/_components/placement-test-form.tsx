"use client";

import React, { useState } from "react";
import { useActionState } from "react";
import { submitPlacementTest } from "../_actions/submit-placement";
import type { PlacementActionState } from "../_actions/submit-placement";
import {
  PLACEMENT_CATEGORY_LABEL,
  PLACEMENT_DIFFICULTY_LABEL,
  isPlacementCategory,
} from "@cyberlearn/lib/onboarding/placement";
import type { PlacementQuestionView as PlacementQuestion } from "@/lib/onboarding/placement";
import { CornerBrackets } from "@/app/_components/corner-brackets";

interface PlacementTestFormProps {
  questions: PlacementQuestion[];
  estimatedMinutes: number;
}

const CAT_COLORS: Record<string, string> = {
  DEV: "var(--color-rarity-rare)",
  CYBERSEC: "var(--color-category-cybersec)",
  NETWORK: "var(--color-brand-turquoise)",
};

const initialState: PlacementActionState = { success: false };

// ── Corner brackets ───────────────────────────────────────────────────────────
export function PlacementTestForm({
  questions,
  estimatedMinutes,
}: PlacementTestFormProps): React.ReactElement {
  const [state, formAction, isPending] = useActionState(submitPlacementTest, initialState);
  const [selected, setSelected] = useState<Record<string, string>>({});

  const grouped = questions.reduce<Record<string, PlacementQuestion[]>>((acc, q) => {
    const arr = acc[q.category] ?? [];
    arr.push(q);
    acc[q.category] = arr;
    return acc;
  }, {});

  const totalAnswered = Object.keys(selected).length;

  return (
    <div style={{ width: "100%", maxWidth: 640 }}>
      {/* ── Intro card ──────────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          position: "relative",
          marginBottom: 32,
          padding: "32px 36px 28px",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: -1,
            zIndex: -1,
            background:
              "linear-gradient(135deg, rgba(10,255,212,0.35), rgba(0,36,255,0.25) 50%, transparent 100%)",
            filter: "blur(16px)",
            opacity: 0.55,
          }}
        />
        <CornerBrackets inset={8} thickness={1.5} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <h2
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 30,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--color-text-primary)",
              margin: "0 0 14px",
            }}
          >
            Où en es-tu{" "}
            <em
              style={{
                fontStyle: "normal",
                background:
                  "linear-gradient(135deg, var(--color-brand-blue) 0%, var(--color-brand-turquoise) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              vraiment ?
            </em>
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 14.5,
              color: "var(--color-text-secondary)",
              lineHeight: 1.6,
              margin: "0 0 22px",
              maxWidth: 480,
            }}
          >
            {questions.length} questions rapides pour calibrer ton point de départ. Aucun XP
            n&apos;est attribué, c&apos;est uniquement pour t&apos;orienter.
          </p>

          {/* Stats grid */}
          <div
            className="card"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 0,
              marginBottom: 22,
            }}
          >
            {[
              { label: "Questions", value: String(questions.length), unit: "" },
              { label: "Durée", value: String(estimatedMinutes), unit: "min" },
              { label: "XP max", value: "0", unit: "XP", accent: false },
              { label: "Difficulté", value: "Mixte", unit: "", accent: true },
            ].map(({ label, value, unit, accent }, i) => (
              <div
                key={label}
                style={{
                  padding: "16px 14px",
                  borderRight: i < 3 ? "1px solid var(--color-border-default)" : "none",
                }}
              >
                <span
                  className="mono-label mono-label--xs"
                  style={{
                    display: "block",
                    color: "var(--color-text-muted)",
                    marginBottom: 8,
                  }}
                >
                  {label}
                </span>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 700,
                    fontSize: 22,
                    letterSpacing: "-0.02em",
                    color: accent ? "var(--color-brand-turquoise)" : "var(--color-text-primary)",
                    lineHeight: 1,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 4,
                  }}
                >
                  {value}
                  {unit && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--color-text-muted)",
                        fontWeight: 500,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Note */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--color-text-muted)",
              letterSpacing: "0.04em",
              lineHeight: 1.6,
              padding: "12px 14px",
              background: "rgba(10,255,212,0.04)",
              borderLeft: "2px solid var(--color-brand-turquoise)",
              marginBottom: 0,
            }}
          >
            <b style={{ color: "var(--color-brand-turquoise)", fontWeight: 600 }}>Note :</b> les
            niveaux débutant des domaines maîtrisés seront débloqués automatiquement. Tu peux passer
            ce test à tout moment.
          </div>
        </div>
      </div>

      {/* ── Questions form ──────────────────────────────────────────────── */}
      <form action={formAction}>
        {state.message && (
          <div
            role="alert"
            style={{
              marginBottom: 18,
              padding: "10px 14px",
              background: "rgba(255,71,87,0.08)",
              border: "1px solid rgba(255,71,87,0.4)",
              color: "var(--color-category-cybersec)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.04em",
            }}
          >
            {state.message}
          </div>
        )}

        {Object.entries(grouped).map(([category, catQs]) => {
          const catColor = CAT_COLORS[category] ?? "var(--color-rarity-rare)";
          const catLabel = isPlacementCategory(category)
            ? PLACEMENT_CATEGORY_LABEL[category]
            : category;

          return (
            <section key={category} style={{ marginBottom: 32 }}>
              {/* Category header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: `1px solid var(--color-border-default)`,
                }}
              >
                <span
                  style={{
                    width: 3,
                    height: 18,
                    background: catColor,
                    boxShadow: `0 0 8px ${catColor}`,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <span
                  className="mono-label"
                  style={{
                    fontWeight: 700,
                    color: catColor,
                  }}
                >
                  {catLabel}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--color-text-faint)",
                    letterSpacing: "0.08em",
                  }}
                >
                  · {catQs.length} question{catQs.length > 1 ? "s" : ""}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {catQs.map((q, idx) => {
                  const options = q.options;
                  const diffLabel = PLACEMENT_DIFFICULTY_LABEL[q.difficulty] ?? q.difficulty;
                  const num = String(idx + 1).padStart(2, "0");

                  return (
                    <fieldset
                      key={q.id}
                      style={{
                        margin: 0,
                        padding: "22px 24px",
                        background: "rgba(10,8,38,0.6)",
                        border: "1px solid var(--color-border-default)",
                        position: "relative",
                      }}
                    >
                      <legend
                        style={{ padding: 0, float: "left", width: "100%", marginBottom: 14 }}
                      >
                        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                          <span
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontWeight: 800,
                              fontSize: 28,
                              letterSpacing: "-0.03em",
                              color: "var(--color-text-faint)",
                              lineHeight: 1,
                              flexShrink: 0,
                            }}
                          >
                            {num}
                          </span>
                          <div>
                            <span
                              className="mono-label mono-label--xs"
                              style={{
                                display: "inline-block",
                                marginBottom: 6,
                                fontWeight: 600,
                                color: catColor,
                                background: `color-mix(in srgb, ${catColor} 10%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${catColor} 25%, transparent)`,
                                padding: "2px 8px",
                              }}
                            >
                              {diffLabel}
                            </span>
                            <p
                              style={{
                                margin: 0,
                                fontFamily: "var(--font-body)",
                                fontSize: 14,
                                color: "var(--color-text-primary)",
                                lineHeight: 1.5,
                              }}
                            >
                              {q.question}
                            </p>
                          </div>
                        </div>
                      </legend>

                      <div
                        style={{ display: "flex", flexDirection: "column", gap: 8, clear: "both" }}
                      >
                        {options.map((opt) => {
                          const isSelected = selected[q.id] === opt.id;
                          return (
                            <label
                              key={opt.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                padding: "12px 16px",
                                cursor: "pointer",
                                background: isSelected
                                  ? "rgba(10,255,212,0.06)"
                                  : "rgba(5,4,26,0.6)",
                                border: `1px solid ${isSelected ? "rgba(10,255,212,0.4)" : "var(--color-border-default)"}`,
                                boxShadow: isSelected ? "0 0 0 1px rgba(10,255,212,0.2)" : "none",
                                transition: "background 120ms ease, border-color 120ms ease",
                              }}
                              onMouseEnter={(e) => {
                                if (isSelected) return;
                                e.currentTarget.style.borderColor = "var(--color-text-muted)";
                                e.currentTarget.style.background = "rgba(10,8,38,0.9)";
                              }}
                              onMouseLeave={(e) => {
                                if (isSelected) return;
                                e.currentTarget.style.borderColor = "var(--color-border-default)";
                                e.currentTarget.style.background = "rgba(5,4,26,0.6)";
                              }}
                            >
                              <input
                                type="radio"
                                name={`answer_${q.id}`}
                                value={opt.id}
                                required
                                checked={isSelected}
                                onChange={() => {
                                  setSelected((prev) => ({ ...prev, [q.id]: opt.id }));
                                }}
                                style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                              />
                              {/* Custom radio indicator */}
                              <span
                                style={{
                                  width: 14,
                                  height: 14,
                                  border: `1.5px solid ${isSelected ? "var(--color-brand-turquoise)" : "var(--color-text-muted)"}`,
                                  borderRadius: "50%",
                                  display: "grid",
                                  placeItems: "center",
                                  flexShrink: 0,
                                  background: isSelected ? "rgba(10,255,212,0.15)" : "transparent",
                                  boxShadow: isSelected ? "0 0 8px rgba(10,255,212,0.4)" : "none",
                                  transition: "border-color 120ms ease, background 120ms ease",
                                }}
                                aria-hidden="true"
                              >
                                {isSelected && (
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      background: "var(--color-brand-turquoise)",
                                      boxShadow: "0 0 6px var(--color-brand-turquoise)",
                                    }}
                                  />
                                )}
                              </span>
                              <span
                                style={{
                                  fontFamily: "var(--font-body)",
                                  fontSize: 13.5,
                                  color: isSelected
                                    ? "var(--color-text-primary)"
                                    : "var(--color-text-secondary)",
                                  lineHeight: 1.45,
                                }}
                              >
                                {opt.text}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
          {/* Progress counter */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--color-text-muted)",
              letterSpacing: "0.08em",
              textAlign: "center",
            }}
          >
            <b
              style={{
                color:
                  totalAnswered === questions.length
                    ? "var(--color-brand-turquoise)"
                    : "var(--color-text-secondary)",
                fontWeight: 600,
              }}
            >
              {totalAnswered}
            </b>
            {" / "}
            {questions.length} réponses
          </div>

          <button
            className="btn btn--lg btn--block"
            type="submit"
            disabled={isPending}
            style={{
              opacity: isPending ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (isPending) return;
              e.currentTarget.style.background = "#1F3BFF";
              e.currentTarget.style.boxShadow =
                "0 0 32px rgba(0,36,255,0.55), inset 0 0 0 1px rgba(255,255,255,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--color-brand-blue)";
              e.currentTarget.style.boxShadow =
                "0 0 24px rgba(0,36,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.1)";
            }}
          >
            {isPending ? (
              <span
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.7s linear infinite",
                }}
              />
            ) : (
              <>
                Valider le test <span style={{ fontSize: 16 }}>→</span>
              </>
            )}
          </button>

          <a
            className="mono-label"
            href="/dashboard"
            style={{
              color: "var(--color-text-muted)",
              textDecoration: "none",
              textAlign: "center",
              borderBottom: "1px solid transparent",
              paddingBottom: 2,
              transition: "color 180ms ease",
              display: "block",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            Passer · aller au tableau de bord
          </a>
        </div>
      </form>
    </div>
  );
}
