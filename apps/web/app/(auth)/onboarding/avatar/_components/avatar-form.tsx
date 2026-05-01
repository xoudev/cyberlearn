"use client";

import React, { useState, useActionState } from "react";
import Image from "next/image";
import { saveAvatar } from "../_actions/save-avatar";
import type { SaveAvatarState } from "../_actions/save-avatar";
import Link from "next/link";

const AVATARS = [
  { path: "/avatars/av-1.svg", label: "CYBER" },
  { path: "/avatars/av-2.svg", label: "CIRCUIT" },
  { path: "/avatars/av-3.svg", label: "ALERT" },
  { path: "/avatars/av-4.svg", label: "ORBIT" },
  { path: "/avatars/av-5.svg", label: "SIGNAL" },
  { path: "/avatars/av-6.svg", label: "SHIELD" },
  { path: "/avatars/av-7.svg", label: "NODE" },
  { path: "/avatars/av-8.svg", label: "CL" },
] as const;

const initialState: SaveAvatarState = {};

interface AvatarFormProps {
  currentAvatarUrl: string | null;
}

export function AvatarForm({ currentAvatarUrl }: AvatarFormProps): React.ReactElement {
  const [state, formAction, isPending] = useActionState(saveAvatar, initialState);
  const defaultAvatar =
    AVATARS.find((a) => a.path === currentAvatarUrl)?.path ?? "/avatars/av-8.svg";
  const [selected, setSelected] = useState<string>(defaultAvatar);

  return (
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
      {/* Edge glow */}
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
          <b style={{ color: "#0AFFD4", fontWeight: 700 }}>›</b> CHOISIR TON AVATAR
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
          02/03
        </span>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "#B8B5D1",
            lineHeight: 1.55,
            margin: "0 0 22px",
          }}
        >
          Choisis un avatar par défaut, ou importe une image. Tu pourras le changer plus tard.
        </p>

        {state.error && (
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
            }}
          >
            {state.error}
          </div>
        )}

        <form action={formAction}>
          <input type="hidden" name="avatarUrl" value={selected} />

          {/* Avatar grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
              marginBottom: 22,
            }}
          >
            {AVATARS.map(({ path, label }) => {
              const isSelected = selected === path;
              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => {
                    setSelected(path);
                  }}
                  style={{
                    position: "relative",
                    aspectRatio: "1 / 1",
                    background: isSelected ? "rgba(10,255,212,0.06)" : "#05041A",
                    border: `1px solid ${isSelected ? "#0AFFD4" : "#2A2560"}`,
                    boxShadow: isSelected
                      ? "0 0 0 1px rgba(10,255,212,0.3), 0 0 24px rgba(10,255,212,0.2)"
                      : "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "border-color 120ms ease, background 120ms ease",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    if (isSelected) return;
                    e.currentTarget.style.borderColor = "#6F6B99";
                    e.currentTarget.style.background = "#07062A";
                  }}
                  onMouseLeave={(e) => {
                    if (isSelected) return;
                    e.currentTarget.style.borderColor = "#2A2560";
                    e.currentTarget.style.background = "#05041A";
                  }}
                >
                  {/* Corner brackets on selected */}
                  {isSelected &&
                    (["tl", "tr", "bl", "br"] as const).map((pos) => (
                      <span
                        key={pos}
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          width: 10,
                          height: 10,
                          border: "1.5px solid #0AFFD4",
                          pointerEvents: "none",
                          top: pos.startsWith("t") ? 4 : undefined,
                          bottom: pos.startsWith("b") ? 4 : undefined,
                          left: pos.endsWith("l") ? 4 : undefined,
                          right: pos.endsWith("r") ? 4 : undefined,
                          borderRight: pos.endsWith("l") ? "none" : undefined,
                          borderLeft: pos.endsWith("r") ? "none" : undefined,
                          borderBottom: pos.startsWith("t") ? "none" : undefined,
                          borderTop: pos.startsWith("b") ? "none" : undefined,
                        }}
                      />
                    ))}

                  <Image
                    src={path}
                    alt={label}
                    width={48}
                    height={48}
                    style={{ width: "60%", height: "60%", objectFit: "contain" }}
                    unoptimized
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: isSelected ? "#0AFFD4" : "#6F6B99",
                    }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Import button (placeholder) */}
          <button
            type="button"
            disabled
            title="Disponible prochainement"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              width: "100%",
              height: 52,
              background: "transparent",
              border: "1px dashed #44406B",
              color: "#44406B",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: 11.5,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              cursor: "not-allowed",
              marginBottom: 22,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12 L2 14 L14 14 L14 12" />
              <path d="M8 2 L8 10" />
              <path d="M5 5 L8 2 L11 5" />
            </svg>
            Importer une photo
          </button>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12 }}>
            <Link
              href="/onboarding"
              style={{
                flex: "0 0 auto",
                height: 52,
                padding: "0 20px",
                display: "inline-flex",
                alignItems: "center",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                background: "transparent",
                border: "1px solid #2A2560",
                color: "#B8B5D1",
                textDecoration: "none",
                transition: "border-color 180ms ease, color 180ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#6F6B99";
                (e.currentTarget as HTMLAnchorElement).style.color = "#F5F5FA";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#2A2560";
                (e.currentTarget as HTMLAnchorElement).style.color = "#B8B5D1";
              }}
            >
              ← Retour
            </Link>

            <button
              type="submit"
              disabled={isPending}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
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
                opacity: isPending ? 0.5 : 1,
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
                  Continuer <span style={{ fontSize: 16 }}>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
