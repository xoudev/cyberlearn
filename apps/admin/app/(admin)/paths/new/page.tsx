import React from "react";
import { prisma } from "@cyberlearn/db";
import { NewPathClient } from "./_components/NewPathClient";

export const dynamic = "force-dynamic";

export default async function NewPathPage(): Promise<React.ReactElement> {
  const lessons = await prisma.lesson.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      refCode: true,
      title: true,
      category: true,
      difficulty: true,
      estimatedMinutes: true,
      xpReward: true,
    },
  });

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <span
          aria-disabled="true"
          title="Enregistre le parcours d'abord pour gérer le quiz"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#44406B",
            background: "transparent",
            border: "1px solid #1F1B47",
            borderRadius: 0,
            cursor: "not-allowed",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
            <path d="M5.2 7 V5 C5.2 3.4 6.4 2.2 8 2.2 C9.6 2.2 10.8 3.4 10.8 5 V7" />
          </svg>
          Gérer le quiz final
        </span>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#6B6890",
            margin: "8px 0 0",
            letterSpacing: "0.02em",
          }}
        >
          {"Enregistre le parcours d'abord pour gérer le quiz final."}
        </p>
      </div>
      <NewPathClient availableLessons={lessons} />
    </>
  );
}
