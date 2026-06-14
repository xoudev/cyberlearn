import React from "react";
import Image from "next/image";
import Link from "next/link";
import { lessonRepository } from "@cyberlearn/db";
import { resolveAvatarSrcMany } from "@/lib/avatar/storage";

const RANK_META = [
  { label: "01", color: "#FFB547", glow: "rgba(255,181,71,0.35)", title: "1er finisher" },
  { label: "02", color: "#B8B5D1", glow: "rgba(184,181,209,0.25)", title: "2ème finisher" },
  { label: "03", color: "#D97757", glow: "rgba(217,119,87,0.25)", title: "3ème finisher" },
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

  // Resolve uploaded-avatar markers to short-lived signed URLs in one batch at
  // this server boundary, before the values reach the render JSX. The helper
  // passes nulls, built-ins and `__glyph:` markers through unchanged, so the
  // public/glyph handling below keeps working.
  const resolvedAvatars = await resolveAvatarSrcMany(
    finishers.map((f) => f.user.avatarUrl ?? null),
  );

  // ── Shared: resolve user display info per entry ──────────────────────────────
  const entries = finishers.map((entry, i) => {
    const meta = RANK_META[i];
    const isPublic = entry.user.preferences?.publicProfile !== false;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const name = isPublic ? entry.user.displayName || entry.user.username || "Inconnu" : "Anonyme";
    const rawAvatar = isPublic ? (resolvedAvatars[i] ?? null) : null;
    const avatar = rawAvatar && !rawAvatar.startsWith("__glyph:") ? rawAvatar : null;
    const profileUrl = isPublic && entry.user.username ? `/u/${entry.user.username}` : null;
    const completedAt = entry.completedAt;
    const dateStr = completedAt
      ? new Intl.DateTimeFormat("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(completedAt)
      : "-";
    return { entry, meta, name, avatar, profileUrl, dateStr };
  });

  // ── Rail variant: vertical list in right rail ────────────────────────────────
  if (variant === "rail") {
    const HEX_GRADIENTS = [
      "linear-gradient(135deg, #0AFFD4, #08D4B0)",
      "linear-gradient(135deg, #0024FF, #6E8BFF)",
      "linear-gradient(135deg, #FF4757, #FFB547)",
    ] as const;

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
          First Blood · <b style={{ color: "#0AFFD4", fontWeight: 700 }}>top {entries.length}</b>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {entries.map(({ entry, meta, name, avatar, profileUrl, dateStr }, rankIdx) => {
            const hexGradient = HEX_GRADIENTS[rankIdx] ?? HEX_GRADIENTS[2];
            const inner = (
              <div
                className="first-blood-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 32px 1fr auto",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                }}
              >
                {/* Rank */}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: "0.04em",
                    color: meta?.color ?? "#B8B5D1",
                  }}
                >
                  #{meta?.label ?? String(rankIdx + 1).padStart(2, "0")}
                </span>

                {/* Hexagonal avatar */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    background: hexGradient,
                    clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt={name}
                      fill
                      style={{
                        objectFit: "cover",
                        clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                      }}
                      sizes="30px"
                    />
                  ) : (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: 11,
                        color: "#030219",
                      }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Name */}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: meta?.color ?? "#B8B5D1",
                    fontWeight: 500,
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
                    letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
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
