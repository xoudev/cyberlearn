import path from "node:path";
import { readFile } from "node:fs/promises";
import React from "react";
import { ImageResponse } from "next/og";
import { userRepository } from "@cyberlearn/db";
import { previewCardText, previewHandle } from "@/lib/profile/preview-card";
import { BASTION_MARK_PATHS } from "@/components/bastion-logo";

export const alt = "Un profil CyberLearn";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function ProfilePreviewImage({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<ImageResponse> {
  // A link preview always reads as a stranger, including for an authenticated request.
  const handle = previewHandle((await params).username);
  const card = handle === null ? null : await userRepository.findPreviewCard(handle);
  const text = previewCardText(card);
  const [displayFont, bodyFont, fallbackFont] = await Promise.all([
    readFile(path.join(process.cwd(), "public/brand/fonts/BarlowCondensed-SemiBold.ttf")),
    readFile(path.join(process.cwd(), "public/brand/fonts/SpaceGrotesk-Regular.ttf")),
    readFile(path.join(process.cwd(), "public/brand/fonts/NotoSans-Regular.ttf")),
  ]);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 64px",
        background: "#0B0C0E",
        color: "#F4F2ED",
        fontFamily: "Space Grotesk",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: "#EAE7DF",
            color: "#141518",
            padding: "12px 20px",
          }}
        >
          <svg width="42" height="42" viewBox="0 0 256 256">
            <path d={BASTION_MARK_PATHS.top} fill="#FF6B2B" />
            <path d={BASTION_MARK_PATHS.left} fill="#141518" />
            <path d={BASTION_MARK_PATHS.right} fill="#141518" />
            <path d={BASTION_MARK_PATHS.core} fill="#FF6B2B" />
          </svg>
          <span style={{ fontFamily: "Barlow Condensed", fontSize: 34, fontWeight: 600 }}>
            CYBERLEARN.
          </span>
        </div>
        <span style={{ fontSize: 20, color: "#AAA79F" }}>{text.eyebrow}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 24, marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Barlow Condensed",
            fontSize: text.title.length > 32 ? 76 : 96,
            fontWeight: 600,
            lineHeight: 1.05,
          }}
        >
          {text.title}
        </div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 27, color: "#C2BFB8" }}>
          {text.subtitle}
        </div>
      </div>
      {text.stats.length > 0 ? (
        <div
          style={{ display: "flex", background: "#EAE7DF", color: "#141518", padding: "24px 28px" }}
        >
          {text.stats.map((stat) => (
            <div key={stat.label} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <span style={{ fontSize: 18, color: "#55524D" }}>{stat.label}</span>
              <span
                style={{
                  fontFamily: "Barlow Condensed",
                  fontSize: 52,
                  fontWeight: 600,
                  marginTop: 5,
                }}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", fontSize: 22, color: "#FF864F" }}>
          Apprendre. Pratiquer. Progresser.
        </div>
      )}
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Barlow Condensed",
          data: Uint8Array.from(displayFont).buffer,
          weight: 600,
          style: "normal",
        },
        {
          name: "Space Grotesk",
          data: Uint8Array.from(bodyFont).buffer,
          weight: 400,
          style: "normal",
        },
        {
          name: "Noto Sans",
          data: Uint8Array.from(fallbackFont).buffer,
          weight: 400,
          style: "normal",
        },
      ],
    },
  );
}
