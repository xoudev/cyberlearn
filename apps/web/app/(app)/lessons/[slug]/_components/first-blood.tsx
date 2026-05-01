import React from "react";
import Image from "next/image";
import Link from "next/link";
import { lessonRepository } from "@cyberlearn/db";

const RANK_META = [
  { label: "01", color: "#FFB020", glow: "rgba(255,176,32,0.35)", title: "1er finisher" },
  { label: "02", color: "#B8B5D1", glow: "rgba(184,181,209,0.25)", title: "2ème finisher" },
  { label: "03", color: "#C17A3E", glow: "rgba(193,122,62,0.25)", title: "3ème finisher" },
] as const;

interface Props {
  lessonId: string;
  variant?: "bar" | "rail";
}

export async function FirstBlood({
  lessonId,
  variant = "bar",
}: Props): Promise<React.ReactElement | null> {
  const finishers = await lessonRepository.findFirstBlood(lessonId);
  if (finishers.length === 0) return null;

  // ── Shared: resolve user display info per entry ──────────────────────────────
  const entries = finishers.map((entry, i) => {
    const meta = RANK_META[i];
    const isPublic = entry.user.preferences?.publicProfile !== false;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const name = isPublic ? entry.user.displayName || entry.user.username || "Inconnu" : "Anonyme";
    const rawAvatar = isPublic ? (entry.user.avatarUrl ?? null) : null;
    const avatar = rawAvatar && !rawAvatar.startsWith("__glyph:") ? rawAvatar : null;
    const profileUrl = isPublic && entry.user.username ? `/u/${entry.user.username}` : null;
    const completedAt = entry.completedAt;
    const dateStr = completedAt
      ? new Intl.DateTimeFormat("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(completedAt)
      : "—";
    return { entry, meta, name, avatar, profileUrl, dateStr };
  });

  // ── Rail variant: vertical list in right rail ────────────────────────────────
  if (variant === "rail") {
    return (
      <div>
        {/* Section header */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#3F3D5C",
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
            paddingBottom: 10,
            borderBottom: "1px solid #1F1B47",
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#FF4757",
              boxShadow: "0 0 6px #FF4757",
              flexShrink: 0,
            }}
          />
          Premiers arrivés
        </div>

        {entries.map(({ entry, meta, name, avatar, profileUrl, dateStr }, rankIdx) => {
          const inner = (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                borderBottom: "1px solid #1F1B47",
              }}
            >
              {/* Rank */}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 11,
                  color: meta?.color ?? "#B8B5D1",
                  letterSpacing: "0.08em",
                  minWidth: 28,
                  flexShrink: 0,
                }}
              >
                #{meta?.label ?? String(rankIdx + 1).padStart(2, "0")}
              </span>

              {/* Avatar */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#1F1B47",
                  border: `1px solid ${meta?.color ?? "#1F1B47"}`,
                  overflow: "hidden",
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                {avatar ? (
                  <Image src={avatar} alt={name} fill style={{ objectFit: "cover" }} sizes="28px" />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: 11,
                      color: meta?.color ?? "#B8B5D1",
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name */}
              <span
                style={{
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: 13,
                  color: "#F5F5FA",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </span>

              {/* Date */}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "#6B6890",
                  flexShrink: 0,
                  letterSpacing: "0.04em",
                }}
              >
                {dateStr}
              </span>
            </div>
          );

          return profileUrl ? (
            <Link
              key={entry.user.id}
              href={profileUrl}
              style={{ textDecoration: "none" }}
              title={meta?.title}
            >
              {inner}
            </Link>
          ) : (
            <div key={entry.user.id} title={meta?.title}>
              {inner}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Bar variant: horizontal bar (default) ────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 32,
        padding: "14px 20px",
        background: "#0A0826",
        border: "1px solid #1F1B47",
        marginBottom: 36,
      }}
    >
      {/* Label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#FF4757",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#FF4757",
            boxShadow: "0 0 8px #FF4757",
            flexShrink: 0,
          }}
        />
        first_blood
      </div>

      <div style={{ width: 1, height: 28, background: "#1F1B47", flexShrink: 0 }} />

      {/* Finisher rows */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {entries.map(({ entry, meta, name, avatar, profileUrl, dateStr }, rankIdx) => {
          const inner = (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {/* Rank */}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 11,
                  color: meta?.color ?? "#B8B5D1",
                  letterSpacing: "0.08em",
                  textShadow: `0 0 8px ${meta?.glow ?? "transparent"}`,
                }}
              >
                #{meta?.label ?? String(rankIdx + 1).padStart(2, "0")}
              </span>

              {/* Avatar */}
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "#1F1B47",
                  border: `1px solid ${meta?.color ?? "#1F1B47"}`,
                  boxShadow: `0 0 8px ${meta?.glow ?? "transparent"}`,
                  overflow: "hidden",
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                {avatar ? (
                  <Image src={avatar} alt={name} fill style={{ objectFit: "cover" }} sizes="30px" />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: 12,
                      color: meta?.color ?? "#B8B5D1",
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name + date */}
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 600,
                    fontSize: 13,
                    color: "#F5F5FA",
                    lineHeight: 1.2,
                  }}
                >
                  {name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "#6B6890",
                    letterSpacing: "0.04em",
                    marginTop: 2,
                  }}
                >
                  {dateStr}
                </div>
              </div>
            </div>
          );

          return profileUrl ? (
            <Link
              key={entry.user.id}
              href={profileUrl}
              style={{ textDecoration: "none" }}
              title={meta?.title}
            >
              {inner}
            </Link>
          ) : (
            <div key={entry.user.id} title={meta?.title}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
