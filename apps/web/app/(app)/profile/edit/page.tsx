"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { updateProfileAction, type UpdateProfileState } from "./_actions/profile-actions";

export const dynamic = "force-dynamic";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_BIO = 280;

const GLYPHS = ["skull", "ghost", "matrix", "circuit", "bug", "key", "shield", "wire"] as const;
type Glyph = (typeof GLYPHS)[number];

// ── SVG glyphs ────────────────────────────────────────────────────────────────

function GlyphIcon({ name }: { name: Glyph }) {
  const s: React.SVGProps<SVGSVGElement> = {
    viewBox: "0 0 24 24",
    width: 22,
    height: 22,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "skull":
      return (
        <svg {...s}>
          <path d="M5 11C5 6.6 8 4 12 4C16 4 19 6.6 19 11V14L17 16V19H14V17H10V19H7V16L5 14Z" />
          <circle cx="9" cy="11" r="1.4" fill="currentColor" />
          <circle cx="15" cy="11" r="1.4" fill="currentColor" />
          <path d="M11 14L12 16L13 14" />
        </svg>
      );
    case "ghost":
      return (
        <svg {...s}>
          <path d="M5 11C5 6.6 8 4 12 4C16 4 19 6.6 19 11V20L17 18L15 20L13 18L11 20L9 18L7 20L5 18Z" />
          <circle cx="9.5" cy="11" r="1" fill="currentColor" />
          <circle cx="14.5" cy="11" r="1" fill="currentColor" />
        </svg>
      );
    case "matrix":
      return (
        <svg {...s}>
          <path d="M5 4V20M9 4V20M13 4V20M17 4V20M19 4V20" />
          <path d="M5 8H7M9 12H11M13 6H15M17 14H19M5 16H7M13 18H15" />
        </svg>
      );
    case "circuit":
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="2.5" />
          <path d="M12 4V9.5M12 14.5V20M4 12H9.5M14.5 12H20" />
          <circle cx="12" cy="4" r="1.2" fill="currentColor" />
          <circle cx="20" cy="12" r="1.2" fill="currentColor" />
          <circle cx="12" cy="20" r="1.2" fill="currentColor" />
          <circle cx="4" cy="12" r="1.2" fill="currentColor" />
        </svg>
      );
    case "bug":
      return (
        <svg {...s}>
          <rect x="8" y="9" width="8" height="10" rx="3" />
          <path d="M9 13H5M15 13H19M9 9L6 6M15 9L18 6M9 18L6 21M15 18L18 21" />
          <path d="M10 6C10 4.5 11 3.5 12 3.5C13 3.5 14 4.5 14 6" />
        </svg>
      );
    case "key":
      return (
        <svg {...s}>
          <circle cx="8" cy="12" r="4" />
          <path d="M12 12H21M18 12V15M15 12V14" />
        </svg>
      );
    case "shield":
      return (
        <svg {...s}>
          <path d="M12 3L20 6V12C20 16 16.5 19.5 12 21C7.5 19.5 4 16 4 12V6Z" />
          <path d="M9 12L11 14L15 10" />
        </svg>
      );
    case "wire":
      return (
        <svg {...s}>
          <path d="M4 12C4 8 6 6 9 6C12 6 13 9 13 12C13 15 14 18 17 18C19 18 20 16 20 14" />
          <circle cx="9" cy="6" r="1.2" fill="currentColor" />
          <circle cx="20" cy="14" r="1.2" fill="currentColor" />
        </svg>
      );
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CardCorners({ color = "#0AFFD4" }: { color?: string }) {
  return (
    <>
      {(["tl", "tr", "bl", "br"] as const).map((pos) => (
        <span
          key={pos}
          style={{
            position: "absolute",
            width: 18,
            height: 18,
            [pos.startsWith("t") ? "top" : "bottom"]: -1,
            [pos.endsWith("l") ? "left" : "right"]: -1,
            borderColor: color,
            borderStyle: "solid",
            borderWidth: 0,
            ...(pos === "tl"
              ? { borderTopWidth: 2, borderLeftWidth: 2 }
              : pos === "tr"
                ? { borderTopWidth: 2, borderRightWidth: 2 }
                : pos === "bl"
                  ? { borderBottomWidth: 2, borderLeftWidth: 2 }
                  : { borderBottomWidth: 2, borderRightWidth: 2 }),
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "#B8B5D1",
      }}
    >
      <span>
        <span style={{ color: "#0AFFD4", marginRight: 8, fontWeight: 500 }}>›</span>
        {children}
      </span>
      {hint && (
        <span
          style={{
            fontWeight: 500,
            color: "#6B6890",
            letterSpacing: "0.1em",
            fontSize: 10,
            textTransform: "none",
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "#05041A",
  border: "1px solid #2A2560",
  color: "#F5F5FA",
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  letterSpacing: "0.01em",
  padding: "13px 16px",
  outline: "none",
  boxSizing: "border-box",
};

function SegToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        border: "1px solid #2A2560",
        background: "#05041A",
        padding: 3,
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => {
            onChange(opt.value);
          }}
          style={{
            background: value === opt.value ? "rgba(10,255,212,0.08)" : "transparent",
            border: 0,
            cursor: "pointer",
            padding: "10px 18px",
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: value === opt.value ? "#0AFFD4" : "#6B6890",
            boxShadow: value === opt.value ? "inset 0 0 0 1px rgba(10,255,212,0.45)" : "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            transition: "all 150ms ease",
          }}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const initialState: UpdateProfileState = {};

export default function ProfileEditPage(): React.ReactElement {
  const [state, action, isPending] = useActionState(updateProfileAction, initialState);

  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<Glyph>("skull");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const bioOverLimit = bio.length > MAX_BIO;
  const bioWarn = bio.length > MAX_BIO - 40;
  const counterColor = bioOverLimit ? "#FF4D6D" : bioWarn ? "#FFB547" : "#6B6890";

  return (
    <>
      <style>{`
        @keyframes pe-blink{0%,50%{opacity:1}50.01%,100%{opacity:0}}
        @keyframes pe-pulse{0%,100%{opacity:1}50%{opacity:.45}}
        @media(prefers-reduced-motion:reduce){.pe-caret{animation:none!important}}
        .pe-input:focus,.pe-textarea:focus{border-color:#0AFFD4!important;box-shadow:0 0 0 1px rgba(10,255,212,0.3),0 0 14px rgba(10,255,212,0.18)!important}
        .pe-id:focus-within{border-color:#0AFFD4!important;box-shadow:0 0 0 1px rgba(10,255,212,0.3),0 0 14px rgba(10,255,212,0.18)!important}
        .pe-avopt:hover{border-color:#0AFFD4!important;color:#0AFFD4!important;transform:translateY(-1px)}
      `}</style>

      <div className="profile-edit-page">
        {/* Breadcrumb */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "#6B6890",
            marginBottom: 32,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "#0AFFD4" }}>$</span>
          <span>~/</span>
          <b style={{ color: "#B8B5D1", fontWeight: 500 }}>cyberlearn</b>
          <span style={{ color: "#44406B" }}>/</span>
          <span style={{ color: "#B8B5D1" }}>profil</span>
          <span style={{ color: "#44406B" }}>/</span>
          <span style={{ color: "#F5F5FA", fontWeight: 500 }}>éditer</span>
          <span
            className="pe-caret"
            style={{
              display: "inline-block",
              width: 7,
              height: 13,
              background: "#0AFFD4",
              boxShadow: "0 0 8px #0AFFD4",
              marginLeft: 4,
              verticalAlign: -2,
              animation: "pe-blink 1s step-end infinite",
            }}
          />
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            fontSize: "clamp(24px, 3.2vw, 36px)",
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            color: "#F5F5FA",
            margin: "0 0 8px",
            display: "flex",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <span
            style={{
              color: "#0AFFD4",
              textShadow: "0 0 12px rgba(10,255,212,0.5)",
              fontWeight: 500,
            }}
          >
            &gt;
          </span>
          <span>MODIFIER TON IDENTITÉ_</span>
        </h1>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#6B6890",
            margin: "0 0 36px",
          }}
        >
          <span style={{ color: "#44406B" }}>{"// "}</span>session sécurisée · modifications locales
        </p>

        {/* Global error */}
        {state.error && (
          <div
            style={{
              padding: "13px 16px",
              background: "rgba(255,77,109,0.08)",
              border: "1px solid rgba(255,77,109,0.35)",
              borderLeft: "3px solid #FF4D6D",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#FF4D6D",
              marginBottom: 24,
            }}
          >
            {state.error}
          </div>
        )}

        {/* Success */}
        {state.success && (
          <div
            style={{
              padding: "13px 16px",
              background: "rgba(10,255,212,0.06)",
              border: "1px solid rgba(10,255,212,0.3)",
              borderLeft: "3px solid #0AFFD4",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#0AFFD4",
              marginBottom: 24,
            }}
          >
            Profil mis à jour avec succès.
          </div>
        )}

        <form action={action}>
          {/* Hidden fields for toggle state */}
          <input type="hidden" name="avatarGlyph" value={avatar} />
          <input type="hidden" name="visibility" value={visibility} />
          <input type="hidden" name="theme" value={theme} />

          {/* Card */}
          <div
            className="profile-edit-card"
            style={{ position: "relative", background: "#0A0826", border: "1px solid #2A2560" }}
          >
            <CardCorners />
            <span
              style={{
                position: "absolute",
                top: -8,
                left: 28,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#6B6890",
                background: "#030219",
                padding: "0 8px",
              }}
            >
              {"// IDENTITY.CONFIG · "}
              <b style={{ color: "#0AFFD4", fontWeight: 500 }}>EDIT</b>
            </span>

            {/* NOM AFFICHÉ */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "0 0 22px",
                borderBottom: "1px dashed rgba(42,37,96,0.6)",
              }}
            >
              <FieldLabel hint="visible publiquement">NOM AFFICHÉ</FieldLabel>
              <input
                name="displayName"
                type="text"
                required
                maxLength={64}
                placeholder="Ton nom"
                className="pe-input"
                style={INPUT_STYLE}
              />
              {state.fieldErrors?.displayName && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#FF4D6D" }}>
                  {state.fieldErrors.displayName}
                </span>
              )}
            </div>

            {/* IDENTIFIANT */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "22px 0",
                borderBottom: "1px dashed rgba(42,37,96,0.6)",
              }}
            >
              <FieldLabel hint="3–32 caractères · lettres, chiffres, _">IDENTIFIANT</FieldLabel>
              <div className="profile-edit-id-row">
                <div
                  className="pe-id"
                  style={{
                    flex: 1,
                    position: "relative",
                    display: "flex",
                    alignItems: "stretch",
                    background: "#05041A",
                    border: "1px solid #2A2560",
                    transition: "border-color 150ms ease",
                  }}
                >
                  <span
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 42,
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: 16,
                      color: "#0AFFD4",
                      borderRight: "1px solid #2A2560",
                      background: "rgba(10,255,212,0.04)",
                      textShadow: "0 0 10px rgba(10,255,212,0.4)",
                    }}
                  >
                    @
                  </span>
                  <input
                    name="username"
                    type="text"
                    required
                    minLength={3}
                    maxLength={32}
                    placeholder="identifiant"
                    spellCheck={false}
                    autoCapitalize="off"
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: 0,
                      outline: 0,
                      color: "#F5F5FA",
                      fontFamily: "var(--font-mono)",
                      fontSize: 14,
                      padding: "13px 16px",
                      letterSpacing: "0.01em",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: 10.5,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#0AFFD4",
                    padding: "8px 14px",
                    background: "rgba(10,255,212,0.06)",
                    border: "1px solid rgba(10,255,212,0.4)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      color: "#0AFFD4",
                      textShadow: "0 0 10px #0AFFD4",
                      animation: "pe-pulse 2s ease-in-out infinite",
                      fontSize: 10,
                    }}
                  >
                    ●
                  </span>
                  Disponible
                </div>
              </div>
              {state.fieldErrors?.username && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#FF4D6D" }}>
                  {state.fieldErrors.username}
                </span>
              )}
            </div>

            {/* BIO */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "22px 0",
                borderBottom: "1px dashed rgba(42,37,96,0.6)",
              }}
            >
              <FieldLabel hint="markdown léger autorisé">BIO</FieldLabel>
              <div style={{ position: "relative" }}>
                <textarea
                  name="bio"
                  value={bio}
                  onChange={(e) => {
                    setBio(e.target.value);
                  }}
                  maxLength={MAX_BIO + 50}
                  placeholder="Parle de toi en quelques lignes…"
                  rows={4}
                  className="pe-textarea"
                  style={{
                    ...INPUT_STYLE,
                    minHeight: 110,
                    resize: "vertical",
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    lineHeight: 1.55,
                    letterSpacing: 0,
                    paddingBottom: 32,
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 14,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "#6B6890",
                    background: "rgba(5,4,26,0.85)",
                    padding: "2px 6px",
                    pointerEvents: "none",
                  }}
                >
                  <b style={{ color: counterColor, fontWeight: 500 }}>{bio.length}</b> / {MAX_BIO}
                </span>
              </div>
            </div>

            {/* AVATAR */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "22px 0",
                borderBottom: "1px dashed rgba(42,37,96,0.6)",
              }}
            >
              <FieldLabel hint="8 presets · hex">AVATAR</FieldLabel>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: 28,
                  alignItems: "start",
                }}
              >
                {/* Current hex */}
                <div
                  style={{
                    position: "relative",
                    width: 110,
                    height: 126,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(135deg, #FFB547 0%, #FF4757 50%, #0024FF 100%)",
                      clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 2,
                      background: "#0A0826",
                      clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      width: "calc(100% - 12px)",
                      height: "calc(100% - 12px)",
                      display: "grid",
                      placeItems: "center",
                      clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
                      background: "linear-gradient(160deg, #1a1640, #070520aa)",
                      overflow: "hidden",
                    }}
                  >
                    <span style={{ position: "relative", zIndex: 1, color: "#0AFFD4" }}>
                      <GlyphIcon name={avatar} />
                    </span>
                  </div>
                  <span
                    style={{
                      position: "absolute",
                      left: "50%",
                      bottom: -22,
                      transform: "translateX(-50%)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "#6B6890",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {"// actuel"}
                  </span>
                </div>

                {/* Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0,1fr))",
                    gap: 10,
                    alignContent: "start",
                  }}
                >
                  {GLYPHS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setAvatar(g);
                      }}
                      className="pe-avopt"
                      aria-label={`Avatar ${g}`}
                      style={{
                        aspectRatio: "1/1",
                        background: avatar === g ? "rgba(10,255,212,0.06)" : "#05041A",
                        border: `1px solid ${avatar === g ? "#0AFFD4" : "rgba(42,37,96,0.6)"}`,
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer",
                        color: avatar === g ? "#0AFFD4" : "#B8B5D1",
                        boxShadow:
                          avatar === g
                            ? "0 0 0 1px rgba(10,255,212,0.4) inset, 0 0 12px rgba(10,255,212,0.25)"
                            : "none",
                        transition: "all 150ms ease",
                        position: "relative",
                      }}
                    >
                      <GlyphIcon name={g} />
                      {avatar === g && (
                        <span
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            width: 6,
                            height: 6,
                            background: "#0AFFD4",
                            boxShadow: "0 0 8px #0AFFD4",
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* VISIBILITÉ */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "22px 0",
                borderBottom: "1px dashed rgba(42,37,96,0.6)",
              }}
            >
              <FieldLabel hint="qui peut voir ton parcours">VISIBILITÉ DU PROFIL</FieldLabel>
              <SegToggle
                value={visibility}
                onChange={setVisibility}
                options={[
                  {
                    value: "public",
                    label: "Profil public",
                    icon: (
                      <svg
                        viewBox="0 0 16 16"
                        width={13}
                        height={13}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                      >
                        <circle cx="8" cy="8" r="6" />
                        <path d="M2 8H14M8 2C10 4 10 12 8 14C6 12 6 4 8 2" />
                      </svg>
                    ),
                  },
                  {
                    value: "private",
                    label: "Profil privé",
                    icon: (
                      <svg
                        viewBox="0 0 16 16"
                        width={13}
                        height={13}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                      >
                        <rect x="3" y="7" width="10" height="7" rx="1" />
                        <path d="M5 7V5C5 3.3 6.3 2 8 2C9.7 2 11 3.3 11 5V7" />
                      </svg>
                    ),
                  },
                ]}
              />
            </div>

            {/* THÈME */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 22 }}>
              <FieldLabel hint="préférence d'affichage">THÈME</FieldLabel>
              <SegToggle
                value={theme}
                onChange={setTheme}
                options={[
                  {
                    value: "dark",
                    label: "Sombre",
                    icon: (
                      <svg
                        viewBox="0 0 16 16"
                        width={13}
                        height={13}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                      >
                        <path d="M13 9.5C12 11.5 9.8 13 7.5 13C4.5 13 2.5 10.7 2.5 8C2.5 5.7 4 3.7 6 2.7C5.6 4 5.7 5.5 6.5 6.7C8 9 11 9.7 13 9.5Z" />
                      </svg>
                    ),
                  },
                  {
                    value: "light",
                    label: "Clair",
                    icon: (
                      <svg
                        viewBox="0 0 16 16"
                        width={13}
                        height={13}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                      >
                        <circle cx="8" cy="8" r="3" />
                        <path d="M8 2V3.5M8 12.5V14M2 8H3.5M12.5 8H14M3.8 3.8L4.8 4.8M11.2 11.2L12.2 12.2M3.8 12.2L4.8 11.2M11.2 4.8L12.2 3.8" />
                      </svg>
                    ),
                  },
                ]}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 32 }}>
            <span
              style={{
                marginRight: "auto",
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#6B6890",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  transform: "rotate(45deg)",
                  background: "#FFB547",
                  boxShadow: "0 0 8px #FFB547",
                  display: "inline-block",
                }}
              />
              {isPending ? "Sauvegarde…" : "Modifications non sauvegardées"}
            </span>
            <Link
              href="/profile"
              className="btn-ghost"
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "14px 28px",
                background: "transparent",
                color: "#B8B5D1",
                border: "1px solid #2A2560",
                textDecoration: "none",
              }}
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={isPending || bioOverLimit}
              className="btn-blue"
              style={{
                position: "relative",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "14px 28px",
                background: "#0024FF",
                color: "#fff",
                border: "1px solid #0024FF",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                boxShadow: "0 0 18px rgba(0,36,255,0.45)",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: -1,
                  left: -1,
                  width: 8,
                  height: 8,
                  borderTop: "1.5px solid #0AFFD4",
                  borderLeft: "1.5px solid #0AFFD4",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  bottom: -1,
                  right: -1,
                  width: 8,
                  height: 8,
                  borderBottom: "1.5px solid #0AFFD4",
                  borderRight: "1.5px solid #0AFFD4",
                }}
              />
              Sauvegarder{" "}
              <span
                style={{
                  color: "#0AFFD4",
                  textShadow: "0 0 8px rgba(10,255,212,0.6)",
                  fontWeight: 500,
                }}
              >
                →
              </span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
