import React from "react";
import Image from "next/image";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@cyberlearn/db";
import { avatarToKeep } from "@cyberlearn/lib/onboarding/avatars";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import { AvatarForm } from "./_components/avatar-form";
import { OnboardingSignOut } from "../_components/onboarding-sign-out";

export default async function OnboardingAvatarPage(): Promise<React.ReactElement> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { username: true, displayName: true, avatarUrl: true },
  });

  if (!dbUser?.username) redirect("/onboarding");

  // The avatar to keep, drawable: a photo uploaded at this step is stored as
  // a marker, which only the server can sign. Unsigned, the tile shows the
  // initials and the step still works.
  const keep = avatarToKeep(dbUser.avatarUrl);
  const keepSrc = keep === null ? null : await resolveAvatarSrc(keep).catch(() => null);

  return (
    <div
      style={{
        background: "var(--color-bg-base)",
        minHeight: "100vh",
        position: "relative",
        color: "var(--color-text-primary)",
      }}
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

      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <header
        className="mono-label"
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
          borderBottom: "1px solid var(--color-border-default)",
          color: "var(--color-text-muted)",
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
            color: "var(--color-text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          cyber<span style={{ color: "var(--color-brand-turquoise)" }}>learn</span>
        </span>
        <span className="onboarding-bar__label" style={{ color: "var(--color-text-faint)" }}>
          /
        </span>
        <span className="onboarding-bar__label">ONBOARDING · AVATAR</span>
        <span
          className="onboarding-bar__label"
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "var(--color-brand-turquoise)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--color-brand-turquoise)",
              boxShadow: "0 0 6px var(--color-brand-turquoise)",
              display: "inline-block",
              animation: "sidebar-pulse 2s ease-in-out infinite",
            }}
          />
          SYNC EN DIRECT
        </span>
        <OnboardingSignOut />
      </header>

      {/* ── Content ───────────────────────────────────────────────────────── */}
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
              className="mono-label"
              style={{
                color: "var(--color-text-muted)",
                display: "inline-flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                ÉTAPE <b style={{ color: "var(--color-brand-turquoise)", fontWeight: 700 }}>02</b> /
                03
              </span>
              <span style={{ color: "var(--color-text-faint)" }}>·</span>
              <span style={{ color: "var(--color-brand-turquoise)", fontWeight: 600 }}>AVATAR</span>
            </div>
            <span
              className="mono-label"
              style={{
                color: "var(--color-text-muted)",
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
                  background: "var(--color-brand-turquoise)",
                  boxShadow: "0 0 6px var(--color-brand-turquoise)",
                  display: "inline-block",
                  animation: "sidebar-pulse 2s ease-in-out infinite",
                }}
              />
              INITIALISATION
            </span>
          </div>

          {/* Progress track - 66% */}
          <div
            style={{
              position: "relative",
              height: 4,
              background: "rgba(5,4,26,0.9)",
              borderTop: "1px solid var(--color-border-default)",
              borderBottom: "1px solid var(--color-border-default)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "66%",
                background:
                  "linear-gradient(90deg, var(--color-brand-blue) 0%, var(--color-brand-turquoise) 100%)",
                boxShadow: "0 0 12px rgba(10,255,212,0.7)",
                transition: "width 400ms ease-out",
              }}
            />
          </div>

          {/* Step ticks */}
          <div
            className="mono-label"
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 10,
            }}
          >
            {[
              { label: "Identité", state: "done" },
              { label: "Avatar", state: "current" },
              { label: "Objectif", state: "pending" },
            ].map(({ label, state }) => (
              <span
                key={label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color:
                    state === "done"
                      ? "var(--color-brand-turquoise)"
                      : state === "current"
                        ? "var(--color-text-primary)"
                        : "var(--color-text-faint)",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    border: "1px solid currentColor",
                    background: state === "pending" ? "transparent" : "currentColor",
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

        <AvatarForm
          currentAvatarUrl={dbUser.avatarUrl}
          currentAvatarSrc={keepSrc}
          displayName={dbUser.displayName}
        />
      </div>
    </div>
  );
}
