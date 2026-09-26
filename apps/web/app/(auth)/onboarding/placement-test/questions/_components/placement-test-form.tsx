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

interface PlacementTestFormProps {
  questions: PlacementQuestion[];
  estimatedMinutes: number;
}

const CAT_COLORS: Record<string, string> = {
  DEV: "#6E8BFF",
  CYBERSEC: "#FF4757",
  NETWORK: "#0AFFD4",
};

const initialState: PlacementActionState = { success: false };

// ── Corner brackets ───────────────────────────────────────────────────────────
function CornerBrackets(): React.ReactElement {
  const s: React.CSSProperties = {
    position: "absolute",
    width: 14,
    height: 14,
    border: "1.5px solid #0AFFD4",
  };
  return (
    <span style={{ position: "absolute", inset: 8, pointerEvents: "none" }} aria-hidden="true">
      <span style={{ ...s, top: 0, left: 0, borderRight: "none", borderBottom: "none" }} />
      <span style={{ ...s, top: 0, right: 0, borderLeft: "none", borderBottom: "none" }} />
      <span style={{ ...s, bottom: 0, left: 0, borderRight: "none", borderTop: "none" }} />
      <span style={{ ...s, bottom: 0, right: 0, borderLeft: "none", borderTop: "none" }} />
    </span>
  );
}

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
        style={{
          position: "relative",
          marginBottom: 32,
          padding: "32px 36px 28px",
          background: "rgba(10,8,38,0.85)",
          border: "1px solid #2A2560",
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
        <CornerBrackets />

        <div style={{ position: "relative", zIndex: 1 }}>
          <h2
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 30,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#F5F5FA",
              margin: "0 0 14px",
            }}
          >
            Où en es-tu{" "}
            <em
              style={{
                fontStyle: "normal",
                background: "linear-gradient(135deg, #0024FF 0%, #0AFFD4 100%)",
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
              color: "#B8B5D1",
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
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 0,
              border: "1px solid #2A2560",
              marginBottom: 22,
              background: "rgba(5,4,26,0.5)",
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
                style={{ padding: "16px 14px", borderRight: i < 3 ? "1px solid #2A2560" : "none" }}
              >
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-mono)",
                    fontSize: 9.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#7F7BA9",
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
                    color: accent ? "#0AFFD4" : "#F5F5FA",
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
                        color: "#7F7BA9",
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
              color: "#7F7BA9",
              letterSpacing: "0.04em",
              lineHeight: 1.6,
              padding: "12px 14px",
              background: "rgba(10,255,212,0.04)",
              borderLeft: "2px solid #0AFFD4",
              marginBottom: 0,
            }}
          >
            <b style={{ color: "#0AFFD4", fontWeight: 600 }}>Note :</b> les niveaux débutant des
            domaines maîtrisés seront débloqués automatiquement. Tu peux passer ce test à tout
            moment.
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
              color: "#FF4757",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.04em",
            }}
          >
            {state.message}
          </div>
        )}

        {Object.entries(grouped).map(([category, catQs]) => {
          const catColor = CAT_COLORS[category] ?? "#6E8BFF";
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
                  borderBottom: `1px solid #2A2560`,
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
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: catColor,
                  }}
                >
                  {catLabel}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "#44406B",
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
                        border: "1px solid #2A2560",
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
                              color: "#44406B",
                              lineHeight: 1,
                              flexShrink: 0,
                            }}
                          >
                            {num}
                          </span>
                          <div>
                            <span
                              style={{
                                display: "inline-block",
                                marginBottom: 6,
                                fontFamily: "var(--font-mono)",
                                fontSize: 9,
                                fontWeight: 600,
                                letterSpacing: "0.14em",
                                textTransform: "uppercase",
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
                                color: "#F5F5FA",
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
                                border: `1px solid ${isSelected ? "rgba(10,255,212,0.4)" : "#2A2560"}`,
                                boxShadow: isSelected ? "0 0 0 1px rgba(10,255,212,0.2)" : "none",
                                transition: "background 120ms ease, border-color 120ms ease",
                              }}
                              onMouseEnter={(e) => {
                                if (isSelected) return;
                                e.currentTarget.style.borderColor = "#7F7BA9";
                                e.currentTarget.style.background = "rgba(10,8,38,0.9)";
                              }}
                              onMouseLeave={(e) => {
                                if (isSelected) return;
                                e.currentTarget.style.borderColor = "#2A2560";
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
                                  border: `1.5px solid ${isSelected ? "#0AFFD4" : "#7F7BA9"}`,
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
                                      background: "#0AFFD4",
                                      boxShadow: "0 0 6px #0AFFD4",
                                    }}
                                  />
                                )}
                              </span>
                              <span
                                style={{
                                  fontFamily: "var(--font-body)",
                                  fontSize: 13.5,
                                  color: isSelected ? "#F5F5FA" : "#B8B5D1",
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
              color: "#7F7BA9",
              letterSpacing: "0.08em",
              textAlign: "center",
            }}
          >
            <b
              style={{
                color: totalAnswered === questions.length ? "#0AFFD4" : "#B8B5D1",
                fontWeight: 600,
              }}
            >
              {totalAnswered}
            </b>
            {" / "}
            {questions.length} réponses
          </div>

          <button
            type="submit"
            disabled={isPending}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              width: "100%",
              height: 52,
              padding: "0 20px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: isPending ? "not-allowed" : "pointer",
              border: "1px solid #0024FF",
              background: "#0024FF",
              color: "#FFFFFF",
              opacity: isPending ? 0.6 : 1,
              boxShadow: "0 0 24px rgba(0,36,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.1)",
              transition: "background 180ms ease, box-shadow 180ms ease",
            }}
            onMouseEnter={(e) => {
              if (isPending) return;
              e.currentTarget.style.background = "#1F3BFF";
              e.currentTarget.style.boxShadow =
                "0 0 32px rgba(0,36,255,0.55), inset 0 0 0 1px rgba(255,255,255,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#0024FF";
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
            href="/dashboard"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#7F7BA9",
              textDecoration: "none",
              textAlign: "center",
              borderBottom: "1px solid transparent",
              paddingBottom: 2,
              transition: "color 180ms ease",
              display: "block",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#B8B5D1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#7F7BA9";
            }}
          >
            Passer · aller au tableau de bord
          </a>
        </div>
      </form>
    </div>
  );
}
