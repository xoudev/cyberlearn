"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { claimQuestAction } from "@/app/(app)/dashboard/_actions/quest-actions";

/** Claim button for a completed weekly quest. Calls the server action and refreshes. */
export function ClaimQuestButton({
  questId,
  xpReward,
}: {
  questId: string;
  xpReward: number;
}): React.ReactElement {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const res = await claimQuestAction(questId);
          if (res.ok) {
            toast.success(`+${String(res.xpGained ?? xpReward)} XP réclamés`);
            router.refresh();
          } else {
            toast.error(res.error ?? "Réclamation impossible.");
          }
        });
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 34,
        padding: "0 16px",
        border: "none",
        background: "#0AFFD4",
        color: "#03251F",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.6 : 1,
        clipPath: "polygon(7px 0, 100% 0, calc(100% - 7px) 100%, 0 100%)",
        boxShadow: "0 0 16px rgba(10,255,212,0.35)",
      }}
    >
      {pending ? "…" : `✓ +${String(xpReward)} XP`}
    </button>
  );
}
