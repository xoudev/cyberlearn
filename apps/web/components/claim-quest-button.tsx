"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { claimQuestAction } from "@/app/(app)/dashboard/_actions/quest-actions";
import { LevelUpModal } from "@/components/level-up-modal";

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
  const [levelUp, setLevelUp] = useState<{ newLevel: number; xpGained: number } | null>(null);

  function closeLevelUp() {
    setLevelUp(null);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const res = await claimQuestAction(questId);
            if (res.ok) {
              const gained = res.xpGained ?? xpReward;
              // A level crossing gets the modal, not a toast that would slide
              // away before it registered. The refresh waits until it is closed,
              // so the panel does not re-render out from under it.
              if (res.leveledUp === true && res.newLevel !== undefined) {
                setLevelUp({ newLevel: res.newLevel, xpGained: gained });
              } else {
                toast.success(`+${String(gained)} XP réclamés`);
                router.refresh();
              }
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
          background: "var(--cosmetic-accent)",
          color: "#03251F",
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.6 : 1,
          clipPath: "polygon(7px 0, 100% 0, calc(100% - 7px) 100%, 0 100%)",
          boxShadow: "0 0 16px color-mix(in srgb, var(--cosmetic-accent) 35%, transparent)",
        }}
      >
        {pending ? "…" : `Réclamer +${String(xpReward)} XP`}
      </button>
      {levelUp !== null && (
        <LevelUpModal
          newLevel={levelUp.newLevel}
          xpGained={levelUp.xpGained}
          onClose={closeLevelUp}
        />
      )}
    </>
  );
}
