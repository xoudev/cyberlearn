import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { NewChallengeForm } from "./_components/new-challenge-form";
import type { ChallengeOption } from "./_components/new-challenge-form";

export const metadata: Metadata = { title: "Nouveau challenge" };

export default async function NewChallengePage(): Promise<React.ReactElement> {
  const challenges = await prisma.challenge.findMany({
    where: { isActive: true },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    select: { id: true, refCode: true, title: true },
  });

  const prerequisites: ChallengeOption[] = challenges.map((c) => ({
    id: c.id,
    refCode: c.refCode,
    title: c.title,
  }));

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900 }}>
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#FF4D6D",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          {"// ADMIN › CHALLENGES › NOUVEAU"}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 24,
            fontWeight: 700,
            color: "#F5F5FA",
            margin: 0,
          }}
        >
          Nouveau challenge
        </h1>
      </div>

      <div
        style={{
          background: "#0A0826",
          border: "1px solid #1F1B47",
          padding: 32,
        }}
      >
        <NewChallengeForm prerequisites={prerequisites} />
      </div>
    </div>
  );
}
