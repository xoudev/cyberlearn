import React from "react";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

// Mirrors the settings content area (profile/page.tsx → SettingsCard "Ton identité"
// + ProfileForm). The layout.tsx shell (breadcrumb, header, nav) still renders;
// this only fills the content column. Card surface matches settings tokens:
// bg #0A0826 (elev), 1px #2A2560 (border), square corners (radius 0), pad 28/30.
const CARD_STYLE: React.CSSProperties = {
  background: "#0A0826",
  border: "1px solid #2A2560",
  borderRadius: 0,
  padding: "28px 30px",
};

export default function SettingsLoading(): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* SectionHead: // PROFIL   hint */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 4 }}>
        <Skeleton w={96} h={11} />
        <Skeleton w={180} h={10} />
      </div>

      {/* SettingsCard "Ton identité" + ProfileForm */}
      <SkeletonCard style={CARD_STYLE}>
        {/* Card title */}
        <Skeleton w={150} h={20} style={{ marginBottom: 22 }} />

        {/* Avatar picker: label + 4-col grid of 8 square tiles */}
        <div style={{ marginBottom: 24 }}>
          <Skeleton w={70} h={11} style={{ marginBottom: 10 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={`av-${String(i)}`}
                w="100%"
                h="auto"
                radius={0}
                style={{ aspectRatio: "1 / 1" }}
              />
            ))}
          </div>
        </div>

        {/* Identifiant + Nom affiché: 2-col row, label + 46px input each */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
            marginBottom: 20,
          }}
        >
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={`field-${String(i)}`}>
              <Skeleton w={90} h={11} style={{ marginBottom: 10 }} />
              <Skeleton w="100%" h={46} radius={0} />
            </div>
          ))}
        </div>

        {/* Bio: label + ~80px textarea + char counter */}
        <div>
          <Skeleton w={80} h={11} style={{ marginBottom: 10 }} />
          <Skeleton w="100%" h={80} radius={0} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
            <Skeleton w={60} h={10} />
          </div>
        </div>

        {/* SaveBar: status text + Annuler / Enregistrer buttons.
            Mirrors the real SaveBar wrap behaviour so the skeleton matches on mobile. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            marginTop: 8,
            padding: "14px 20px",
            border: "1px solid #2A2560",
          }}
        >
          <Skeleton w={170} h={11} />
          <div
            style={{
              display: "flex",
              flex: "1 1 auto",
              justifyContent: "flex-end",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <Skeleton w={96} h={40} radius={0} />
            <Skeleton w={140} h={40} radius={0} />
          </div>
        </div>
      </SkeletonCard>
    </div>
  );
}
