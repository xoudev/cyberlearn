"use client";

import React, { useState } from "react";

interface QuizGroupProps {
  children: React.ReactNode;
}

export function QuizGroup({ children }: QuizGroupProps): React.ReactElement {
  const [maxVisible, setMaxVisible] = useState(0);
  const items = React.Children.toArray(children).filter(React.isValidElement);
  const total = items.length;

  return (
    <div style={{ margin: "56px 0 0" }}>
      {/* Step progress dots */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 24,
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#44406B",
            marginRight: 4,
          }}
        >
          Vérification
        </span>
        {items.map((_, i) => {
          const isDone = i < maxVisible;
          const isActive = i === maxVisible;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                width: isDone ? 20 : isActive ? 8 : 6,
                height: 6,
                borderRadius: 999,
                background: isDone ? "var(--cosmetic-accent)" : isActive ? "#0024FF" : "#2A2560",
                boxShadow: isActive ? "0 0 8px rgba(0,36,255,0.6)" : "none",
                transition: "all 300ms ease",
              }}
            />
          );
        })}
        <span style={{ fontSize: 10, color: "#44406B", marginLeft: 4 }}>
          {Math.min(maxVisible + 1, total)}/{total}
        </span>
      </div>

      {/* Quizzes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((child, i) => {
          if (i > maxVisible) return null;
          const isActive = i === maxVisible;
          const isDone = i < maxVisible;

          // SAFETY: child is a React element from MDX; we inject known optional props.
          return React.cloneElement(
            child as React.ReactElement<{
              onCorrect?: () => void;
              isGroupActive?: boolean;
              isGroupDone?: boolean;
              questionNumber?: number;
              questionCount?: number;
            }>,
            {
              key: i,
              // exactOptionalPropertyTypes: omit onCorrect entirely when not active
              ...(isActive
                ? {
                    onCorrect: () => {
                      setMaxVisible((v) => Math.max(v, i + 1));
                    },
                  }
                : {}),
              isGroupActive: isActive,
              isGroupDone: isDone,
              questionNumber: i + 1,
              questionCount: total,
            },
          );
        })}
      </div>
    </div>
  );
}
