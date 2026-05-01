import React from "react";
import Image from "next/image";
import { prisma } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "./_components/onboarding-form";

export default async function OnboardingPage(): Promise<React.ReactElement> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { username: true, displayName: true, avatarUrl: true },
  });

  if (dbUser?.username) redirect("/onboarding/avatar");

  return (
    <div
      style={{ background: "#030219", minHeight: "100vh", position: "relative", color: "#F5F5FA" }}
    >
      {/* ── Ambient glows ───────────────────────────────────────────────── */}
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

      {/* ── Top status bar ───────────────────────────────────────────────── */}
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
        <span>CONFIGURATION · NOUVEL OPÉRATEUR</span>
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

      {/* ── Centered content ──────────────────────────────────────────────── */}
      <div
        className="onboarding-content"
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Progress header */}
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
                ÉTAPE <b style={{ color: "#0AFFD4", fontWeight: 700 }}>01</b> / 03
              </span>
              <span style={{ color: "#44406B" }}>·</span>
              <span style={{ color: "#0AFFD4", fontWeight: 600 }}>PROFIL</span>
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#6F6B99",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
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
              INITIALISATION
            </span>
          </div>

          {/* Progress track */}
          <div
            style={{
              position: "relative",
              height: 4,
              background: "rgba(5,4,26,0.9)",
              borderTop: "1px solid #2A2560",
              borderBottom: "1px solid #2A2560",
              overflow: "visible",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "50%",
                background: "linear-gradient(90deg, #0024FF 0%, #0AFFD4 100%)",
                boxShadow: "0 0 12px rgba(10,255,212,0.7)",
                transition: "width 400ms ease-out",
              }}
            />
          </div>

          {/* Step ticks */}
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
              { label: "Identité", state: "current" },
              { label: "Avatar", state: "pending" },
              { label: "Positionnement", state: "pending" },
            ].map(({ label, state }) => (
              <span
                key={label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: state === "current" ? "#F5F5FA" : "#44406B",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    border: "1px solid currentColor",
                    background:
                      state === "done"
                        ? "currentColor"
                        : state === "current"
                          ? "currentColor"
                          : "transparent",
                    transform: "rotate(45deg)",
                    display: "inline-block",
                    boxShadow: state !== "pending" ? "0 0 6px currentColor" : "none",
                  }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Form panel */}
        <OnboardingForm
          initialDisplayName={
            dbUser?.displayName && dbUser.displayName !== "Utilisateur" ? dbUser.displayName : ""
          }
          avatarUrl={dbUser?.avatarUrl ?? null}
        />
      </div>
    </div>
  );
}
