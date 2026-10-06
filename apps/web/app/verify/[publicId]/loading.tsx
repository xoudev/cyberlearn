import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * A certificate's verification page while it loads, drawn on the page's own
 * layout: its gridded backdrop, the navbar, the meta bar, the status banner
 * (neutral here: valid or revoked is what is being loaded), then the 820px
 * column (.verify-main-content) with the certificate document (header, holder,
 * path, the 1fr meta grid, the hash), the two actions and the 2-column
 * metadata grid (.verify-meta-grid card card--sunken), at their real sizes.
 */

/** A cell of the document's meta row or of the metadata grid: label over value. */
function MetaCell({
  label,
  value,
  h,
  padding,
}: {
  label: number;
  value: number;
  h: number;
  padding: string;
}): React.ReactElement {
  return (
    <div style={{ background: "var(--color-bg-elevated)", padding }}>
      <Skeleton w={label} h={9} style={{ margin: "2px 0 8px" }} />
      <Skeleton w={value} h={h} style={{ margin: "3px 0" }} />
    </div>
  );
}

export default function VerifyLoading(): React.ReactElement {
  return (
    <div
      aria-busy="true"
      aria-label="Vérification du certificat en cours"
      style={{
        position: "relative",
        zIndex: 1,
        background: "var(--color-bg-base)",
        minHeight: "100vh",
        color: "var(--color-text-primary)",
      }}
    >
      {/* Ambient glows and grid, as the page draws them */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: [
            "radial-gradient(ellipse 1200px 600px at 50% -10%, color-mix(in srgb, var(--color-brand-turquoise) 8%, transparent), transparent 60%)",
            "radial-gradient(ellipse 900px 500px at 50% 110%, color-mix(in srgb, var(--color-brand-blue) 18%, transparent), transparent 60%)",
          ].join(", "),
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(to right, color-mix(in srgb, var(--color-border-default) 18%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--color-border-default) 18%, transparent) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 0%, black 40%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 0%, black 40%, transparent 85%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Navbar: the logo and its name, the page's label */}
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 60,
          padding: "0 32px",
          borderBottom: "1px solid var(--color-border-subtle)",
          background: "color-mix(in srgb, var(--color-bg-base) 85%, transparent)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Skeleton w={30} h={30} />
          <Skeleton w={86} h={15} />
        </div>
        <Skeleton w={190} h={11} />
      </div>

      {/* Meta bar: the path to the certificate, the API's version */}
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          zIndex: 1,
          padding: "18px 32px 14px",
          borderBottom: "1px solid var(--color-border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Skeleton w={330} h={12} style={{ margin: "3px 0", maxWidth: "60%" }} />
        <Skeleton w={110} h={10} style={{ marginLeft: "auto" }} />
      </div>

      {/* Status banner */}
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "16px 20px",
          background: "var(--color-bg-elevated)",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Skeleton w={44} h={44} style={{ flexShrink: 0 }} />
          <div>
            <Skeleton w={230} h={24} style={{ margin: "1px 0" }} />
            <Skeleton w={290} h={11} style={{ margin: "7px 0 2px", maxWidth: "100%" }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <Skeleton w={150} h={13} style={{ margin: "2px 0" }} />
          <Skeleton w={64} h={11} style={{ margin: "7px 0 2px" }} />
        </div>
      </div>

      {/* Main column */}
      <div
        aria-hidden="true"
        className="verify-main-content"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 820,
          margin: "0 auto",
          padding: "32px 16px 60px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* Certificate document */}
        <div
          style={{
            position: "relative",
            background: "color-mix(in srgb, var(--color-bg-elevated) 70%, transparent)",
            border: "1px solid var(--color-border-default)",
            padding: "32px 36px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 32,
              paddingBottom: 24,
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Skeleton w={36} h={36} style={{ flexShrink: 0 }} />
              <div>
                <Skeleton w={86} h={15} style={{ margin: "4px 0" }} />
                <Skeleton w={180} h={10} style={{ margin: "5px 0 3px" }} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <Skeleton w={84} h={9} style={{ margin: "2px 0 7px" }} />
              <Skeleton w={150} h={13} style={{ margin: "3px 0" }} />
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <Skeleton w={96} h={11} style={{ margin: "2px 0 12px" }} />
            <Skeleton
              w="min(440px, 90%)"
              h="clamp(34px, 5.7vw, 61px)"
              style={{ margin: "1px 0 10px" }}
            />
            <Skeleton w={130} h={14} style={{ margin: "3px 0 31px" }} />
            <Skeleton w={230} h={11} style={{ margin: "2px 0 10px" }} />
            <Skeleton
              w="min(380px, 80%)"
              h="clamp(20px, 2.5vw, 28px)"
              style={{ marginBottom: 32 }}
            />

            <div
              className="verify-meta-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 1,
                background: "var(--color-border-subtle)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <MetaCell label={72} value={140} h={20} padding="14px 18px" />
              <MetaCell label={80} value={84} h={20} padding="14px 18px" />
              <MetaCell label={64} value={70} h={20} padding="14px 18px" />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              paddingTop: 24,
              borderTop: "1px solid var(--color-border-subtle)",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <Skeleton w={170} h={9} style={{ margin: "2px 0 10px" }} />
              <Skeleton w={60} h={11} style={{ margin: "4px 0" }} />
              <Skeleton w={506} h={11} style={{ margin: "4px 0", maxWidth: "100%" }} />
            </div>
          </div>
        </div>

        {/* Actions: download the PDF, share */}
        <div style={{ display: "flex", gap: 12 }}>
          <Skeleton w={240} h={50} />
          <Skeleton w={148} h={50} />
        </div>

        {/* Metadata grid */}
        <div
          className="verify-meta-grid card card--sunken"
          style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}
        >
          <MetaCell label={70} value={90} h={12} padding="14px 16px" />
          <MetaCell label={64} value={110} h={12} padding="14px 16px" />
          <MetaCell label={74} value={60} h={12} padding="14px 16px" />
          <MetaCell label={74} value={56} h={12} padding="14px 16px" />
        </div>
      </div>
    </div>
  );
}
