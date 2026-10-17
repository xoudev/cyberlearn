import React from "react";
import { ImageResponse } from "next/og";
import { userRepository } from "@cyberlearn/db";
import { previewCardText } from "@/lib/profile/preview-card";

/**
 * A profile's link preview: its owner's name, handle and figures on the
 * site's dark ground, for a public profile; the same card without a name for
 * a private one or a handle that does not exist (previewCardText).
 *
 * Read as a stranger reads it, whoever asks: a shared link travels, and the
 * crawler that fetches it is nobody's friend. Drawn on each request rather
 * than cached, so a profile closed a minute ago stops naming its owner a
 * minute later. The font is ImageResponse's own: nothing is fetched to draw.
 */

export const alt = "Un profil CyberLearn";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

// The site's tokens (packages/ui/src/tokens.css, dark theme), as values: a
// picture has no CSS variables.
const BG = "#030219";
const PANEL = "#0a0826";
const BORDER = "#2a2560";
const TEXT = "#f5f5fa";
const MUTED = "#7f7ba9";
const ACCENT = "#0affd4";
const BRAND = "#0024ff";

export default async function ProfilePreviewImage({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<ImageResponse> {
  const { username } = await params;
  const card = await userRepository.findPreviewCard(username);
  const text = previewCardText(card);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: `linear-gradient(135deg, ${BG} 0%, ${PANEL} 100%)`,
        color: TEXT,
        borderTop: `6px solid ${ACCENT}`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: ACCENT,
          }}
        >
          {text.eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: text.title.length > 22 ? 76 : 96,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          {text.title}
        </div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 34, color: MUTED }}>
          {text.subtitle}
        </div>
      </div>

      {text.stats.length > 0 ? (
        <div style={{ display: "flex", gap: 20 }}>
          {text.stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: "22px 26px",
                border: `2px solid ${BORDER}`,
                background: "rgba(10, 8, 38, 0.8)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  color: MUTED,
                }}
              >
                {stat.label}
              </div>
              <div style={{ display: "flex", marginTop: 8, fontSize: 52, fontWeight: 800 }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", height: 8, width: 240, background: BRAND }} />
      )}
    </div>,
    size,
  );
}
