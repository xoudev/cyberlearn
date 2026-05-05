import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function BadgesLoading(): React.ReactElement {
  return (
    <div className="page-container">
      <div style={{ marginBottom: 40 }}>
        <Skeleton style={{ height: 36, width: 160, marginBottom: 12 }} />
        <Skeleton style={{ height: 14, width: 220 }} />
      </div>
      {Array.from({ length: 2 }).map((_, gi) => (
        <div key={gi} style={{ marginBottom: 48 }}>
          <Skeleton style={{ height: 20, width: 100, marginBottom: 20 }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: "#0A0826",
                  border: "1px solid #1F1B47",
                  padding: "32px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <Skeleton
                  style={{
                    width: 96,
                    height: 112,
                    borderRadius: 0,
                    clipPath: "polygon(50% 0, 100% 28%, 100% 72%, 50% 100%, 0 72%, 0 28%)",
                  }}
                />
                <Skeleton style={{ height: 14, width: "70%" }} />
                <Skeleton style={{ height: 12, width: "50%" }} />
                <Skeleton style={{ height: 22, width: 80, borderRadius: 99 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
