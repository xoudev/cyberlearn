import React from "react";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { skipOnboarding } from "../_actions/finalize-onboarding";

export default async function PlacementTestIntroPage(): Promise<React.ReactElement> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { username: true },
  });

  if (!dbUser?.username) redirect("/onboarding");

  // If already submitted, finalize and go to dashboard
  const existing = await prisma.userPlacementResult.findUnique({ where: { userId: user.id } });
  if (existing) redirect("/dashboard");

  const questionCount = await prisma.placementQuestion.count({ where: { isActive: true } });
  const estimatedMinutes = Math.ceil(questionCount * 0.75);

  return (
    <div
      style={{ background: "#030219", minHeight: "100vh", position: "relative", color: "#F5F5FA" }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background: [
            "radial-gradient(ellipse 1100px 600px at 20% 10%, rgba(0,36,255,0.22), transparent 60%)",
            "radial-gradient(ellipse 900px 500px at 85% 80%, rgba(10,255,212,0.08), transparent 65%)",
            "radial-gradient(ellipse 700px 500px at 50% 110%, rgba(0,36,255,0.14), transparent 60%)",
          ].join(", "),
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: [
            "linear-gradient(to right, rgba(42,37,96,0.16) 1px, transparent 1px)",
            "linear-gradient(to bottom, rgba(42,37,96,0.16) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "48px 48px",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 0%, black 40%, transparent 85%)",
          maskImage: "radial-gradient(ellipse at center, black 0%, black 40%, transparent 85%)",
        }}
      />

      {/* Topbar */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 44,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 32px",
          background: "rgba(3,2,25,0.65)",
          backdropFilter: "blur(20px) saturate(140%)",
          WebkitBackdropFilter: "blur(20px) saturate(140%)",
          borderBottom: "1px solid #2A2560",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#6F6B99",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -1,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(10,255,212,0.35) 20%, rgba(0,36,255,0.35) 80%, transparent)",
          }}
        />
        <Image
          src="/icon_app.png"
          alt="CyberLearn"
          width={20}
          height={20}
          priority
          style={{ flexShrink: 0 }}
        />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 14,
            color: "#F5F5FA",
            letterSpacing: "-0.01em",
          }}
        >
          cyber<span style={{ color: "#0AFFD4" }}>learn</span>
        </span>
        <span style={{ color: "#44406B" }}>/</span>
        <span>ONBOARDING · POSITIONNEMENT</span>
        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "#0AFFD4",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#0AFFD4",
              boxShadow: "0 0 6px #0AFFD4",
              display: "inline-block",
              animation: "sidebar-pulse 2s ease-in-out infinite",
            }}
          />
          SYNC EN DIRECT
        </span>
      </header>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          paddingTop: 44,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "44px 32px 120px",
        }}
      >
        {/* Progress */}
        <div style={{ width: "100%", maxWidth: 640, margin: "56px 0 32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#6F6B99",
                display: "inline-flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <span style={{ color: "#F5F5FA", fontWeight: 600 }}>
                ÉTAPE <b style={{ color: "#0AFFD4", fontWeight: 700 }}>03</b> / 03
              </span>
              <span style={{ color: "#44406B" }}>·</span>
              <span style={{ color: "#0AFFD4", fontWeight: 600 }}>POSITIONNEMENT</span>
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#6F6B99",
              }}
            >
              OPTIONNEL
            </span>
          </div>

          <div
            style={{
              position: "relative",
              height: 4,
              background: "rgba(5,4,26,0.9)",
              borderTop: "1px solid #2A2560",
              borderBottom: "1px solid #2A2560",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "100%",
                background: "linear-gradient(90deg, #0024FF 0%, #0AFFD4 100%)",
                boxShadow: "0 0 12px rgba(10,255,212,0.7)",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 10,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {[
              { label: "Identité", state: "done" },
              { label: "Avatar", state: "done" },
              { label: "Positionnement", state: "current" },
            ].map(({ label, state }) => (
              <span
                key={label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: state === "done" ? "#0AFFD4" : "#F5F5FA",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    border: "1px solid currentColor",
                    background: "currentColor",
                    transform: "rotate(45deg)",
                    display: "inline-block",
                    boxShadow: "0 0 6px currentColor",
                  }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Panel */}
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 640,
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

          {/* Corner brackets */}
          {(["tl", "tr", "bl", "br"] as const).map((pos) => (
            <span
              key={pos}
              aria-hidden="true"
              style={{
                position: "absolute",
                width: 14,
                height: 14,
                border: "1.5px solid #0AFFD4",
                top: pos.startsWith("t") ? 8 : undefined,
                bottom: pos.startsWith("b") ? 8 : undefined,
                left: pos.endsWith("l") ? 8 : undefined,
                right: pos.endsWith("r") ? 8 : undefined,
                borderRight: pos.endsWith("l") ? "none" : undefined,
                borderLeft: pos.endsWith("r") ? "none" : undefined,
                borderBottom: pos.startsWith("t") ? "none" : undefined,
                borderTop: pos.startsWith("b") ? "none" : undefined,
              }}
            />
          ))}

          {/* Panel header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: 18,
              marginBottom: 26,
              borderBottom: "1px solid #1F1B47",
              position: "relative",
              zIndex: 1,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fontSize: 13,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#F5F5FA",
                margin: 0,
              }}
            >
              <b style={{ color: "#0AFFD4", fontWeight: 700 }}>›</b> TEST DE POSITIONNEMENT
              <span style={{ fontWeight: 400, color: "#6F6B99", fontSize: 11, marginLeft: 8 }}>
                (OPTIONNEL)
              </span>
            </h2>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#6F6B99",
              }}
            >
              03/03
            </span>
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <h1
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: "clamp(26px,4vw,34px)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "#F5F5FA",
                margin: "0 0 14px",
              }}
            >
              Mieux te guider,{" "}
              <em
                style={{
                  fontStyle: "normal",
                  background: "linear-gradient(135deg, #0024FF 0%, #0AFFD4 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                dès le début.
              </em>
            </h1>

            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 14.5,
                color: "#B8B5D1",
                lineHeight: 1.6,
                margin: "0 0 26px",
                maxWidth: 480,
              }}
            >
              Un court test pour calibrer ton niveau et suggérer les bons parcours. Aucune pression
              — tu peux le passer à tout moment si tu préfères explorer librement.
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
                { label: "Questions", value: String(questionCount), unit: "", accent: false },
                { label: "Durée", value: String(estimatedMinutes), unit: "min", accent: false },
                { label: "XP planifié", value: "0", unit: "XP", accent: false },
                { label: "Score public", value: "NON", unit: "", accent: true },
              ].map(({ label, value, unit, accent }, i) => (
                <div
                  key={label}
                  style={{
                    padding: "16px 14px",
                    borderRight: i < 3 ? "1px solid #2A2560" : "none",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "#6F6B99",
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
                          color: "#6F6B99",
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

            {/* Info note */}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#6F6B99",
                letterSpacing: "0.04em",
                lineHeight: 1.6,
                padding: "12px 14px",
                background: "rgba(10,255,212,0.04)",
                borderLeft: "2px solid #0AFFD4",
                marginBottom: 26,
              }}
            >
              <b style={{ color: "#0AFFD4", fontWeight: 600 }}>Info :</b> Ces réponses servent
              uniquement à personnaliser les parcours. Aucune note n&apos;est attribuée aux profils.
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Link
                href="/onboarding/placement-test/questions"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  width: "100%",
                  height: 52,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  border: "1px solid #0024FF",
                  background: "#0024FF",
                  color: "#FFFFFF",
                  textDecoration: "none",
                  boxShadow: "0 0 24px rgba(0,36,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.1)",
                  transition: "background 180ms ease, box-shadow 180ms ease",
                }}
                className="btn-blue"
              >
                Commencer le test <span style={{ fontSize: 16 }}>→</span>
              </Link>

              <form action={skipOnboarding}>
                <button
                  type="submit"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    width: "100%",
                    height: 52,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                    fontSize: 12,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    background: "transparent",
                    border: "1px solid #2A2560",
                    color: "#B8B5D1",
                    transition: "border-color 180ms ease, color 180ms ease, background 180ms ease",
                  }}
                  className="btn-ghost"
                >
                  Passer → Accéder au dashboard
                </button>
              </form>

              <Link
                href="/onboarding/avatar"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#6F6B99",
                  textDecoration: "none",
                  textAlign: "center",
                  display: "block",
                  transition: "color 180ms ease",
                }}
                className="link-cta"
              >
                ← Retour
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
