import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function LessonDetailLoading(): React.ReactElement {
  return (
    <div className="lesson-page">
      {/* Breadcrumb pill */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 14px",
          border: "1px solid #2A2560",
          background: "rgba(5,4,26,0.6)",
          marginBottom: 40,
        }}
      >
        <Skeleton style={{ width: 200, height: 12 }} />
      </div>

      {/* Hero grid: title+tags left, briefing card right */}
      <div className="lesson-hero-grid">
        {/* Left col */}
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
            <Skeleton style={{ width: 80, height: 28 }} />
            <Skeleton style={{ width: 100, height: 28 }} />
          </div>
          <Skeleton style={{ height: 64, width: "80%", marginBottom: 22 }} />
          <Skeleton style={{ height: 17, width: "75%", marginBottom: 8 }} />
          <Skeleton style={{ height: 17, width: "55%" }} />
        </div>

        {/* Right col: briefing card */}
        <div className="briefing-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 18px",
              borderBottom: "1px solid #2A2560",
              background: "rgba(10,255,212,0.04)",
            }}
          >
            <Skeleton style={{ height: 10, width: 120 }} />
            <Skeleton style={{ height: 10, width: 60 }} />
          </div>
          <div
            style={{
              padding: "24px 24px 20px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "22px 24px",
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton style={{ height: 10, width: 56 }} />
                <Skeleton style={{ height: 22, width: "70%" }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stepper timeline */}
      <div
        style={{
          margin: "0 0 64px",
          padding: "28px 8px 24px",
          borderTop: "1px solid #1F1B47",
          borderBottom: "1px solid #1F1B47",
          overflowX: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", minWidth: "max-content" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: 120,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                padding: "0 4px",
              }}
            >
              <Skeleton style={{ height: 10, width: 80 }} />
              <Skeleton
                style={{ width: 14, height: 14, transform: "rotate(45deg)", borderRadius: 0 }}
              />
              <Skeleton style={{ height: 10, width: 36 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Stepper content grid */}
      <div className="lesson-stepper-grid">
        {/* Article */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Skeleton style={{ height: 28, width: "55%" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton style={{ height: 14, width: "100%" }} />
            <Skeleton style={{ height: 14, width: "100%" }} />
            <Skeleton style={{ height: 14, width: "88%" }} />
            <Skeleton style={{ height: 14, width: "92%" }} />
            <Skeleton style={{ height: 14, width: "72%" }} />
          </div>
          {/* Code block */}
          <div
            style={{
              background: "#0A0826",
              border: "1px solid #1F1B47",
              borderLeft: "3px solid #0AFFD4",
              borderRadius: 8,
            }}
          >
            <div
              style={{
                padding: "8px 16px",
                borderBottom: "1px solid #1F1B47",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Skeleton style={{ width: 10, height: 10, borderRadius: "50%" }} />
              <Skeleton style={{ height: 10, width: 120 }} />
            </div>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {([80, 55, 90, 42, 68] as const).map((w, i) => (
                <Skeleton key={i} style={{ height: 12, width: `${String(w)}%` }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton style={{ height: 14, width: "100%" }} />
            <Skeleton style={{ height: 14, width: "82%" }} />
            <Skeleton style={{ height: 14, width: "64%" }} />
          </div>
        </div>

        {/* Rail — hidden on mobile via CSS, shown on ≥1024px */}
        <aside className="lesson-stepper-rail">
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div>
              <div
                style={{
                  paddingBottom: 10,
                  marginBottom: 14,
                  borderBottom: "1px solid #1F1B47",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <Skeleton style={{ height: 10, width: 110 }} />
                <Skeleton style={{ height: 10, width: 28 }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 12px",
                      display: "grid",
                      gridTemplateColumns: "24px 1fr auto",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <Skeleton style={{ width: 18, height: 10 }} />
                    <Skeleton style={{ height: 14 }} />
                    <Skeleton style={{ width: 12, height: 10 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
