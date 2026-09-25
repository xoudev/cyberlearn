import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { LevelUpOverlay } from "@/components/anim";
import { ActionChip } from "@/components/buttons";
import { Card, Text, XPBar } from "@/components/ui";
import { claimQuestApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import type { QuestItem } from "@/lib/queries";
import {
  QUEST_COPY,
  claimFeedback,
  fmtWeekReset,
  msUntilWeekReset,
  questState,
  splitWeekQuests,
  weekCompletion,
} from "@/lib/quests";

const AMBER = "#FFB547";

/**
 * The site's weekly-quests panel on the home tab: the reset countdown, the
 * week's completion, each quest with its progress, and its reward to claim
 * once it is done, then the completion bonus. Claiming goes through the
 * site's service (/api/mobile/quests/claim); a claim that crosses a level
 * says so, as a finished lesson does.
 */
export function WeeklyQuests({
  quests,
  userId,
}: {
  quests: QuestItem[];
  userId: string | undefined;
}): React.JSX.Element | null {
  const { theme } = useCosmetics();
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(
    null,
  );
  const [levelUp, setLevelUp] = useState<number | null>(null);

  const { main, bonus } = splitWeekQuests(quests);
  if (main.length === 0) return null;
  const { claimedCount, total, pct, claimedXp, totalXp } = weekCompletion(main);

  const claim = async (quest: QuestItem): Promise<void> => {
    if (claiming !== null) return;
    setClaiming(quest.id);
    setFeedback(null);
    const reply = await claimQuestApi(quest.id);
    setClaiming(null);
    setFeedback(claimFeedback(reply, quest.xpReward));
    if (reply.ok && reply.leveledUp === true && reply.newLevel !== undefined) {
      setLevelUp(reply.newLevel);
    }
    // Claimed or refused, the week is re-read: a refusal is usually a claim
    // made elsewhere in the meantime.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["quests", userId] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard", userId] }),
      queryClient.invalidateQueries({ queryKey: ["profile", userId] }),
      // A bonus can carry a streak-freeze, which the streak panel shows.
      queryClient.invalidateQueries({ queryKey: ["streak", userId] }),
    ]);
  };

  const reward = (quest: QuestItem, tint: string): React.JSX.Element => {
    const state = questState(quest);
    if (state === "claimed") {
      return (
        <Text variant="micro" style={{ color: colors.success }}>
          {QUEST_COPY.claimed}
        </Text>
      );
    }
    if (state === "claimable") {
      return (
        <ActionChip
          label={claiming === quest.id ? "…" : QUEST_COPY.claim(quest.xpReward)}
          disabled={claiming !== null}
          onPress={() => void claim(quest)}
        />
      );
    }
    return (
      <Text variant="mono" style={{ fontSize: 11, color: tint }}>
        {QUEST_COPY.reward(quest.xpReward)}
      </Text>
    );
  };

  return (
    <Card style={{ gap: 14 }}>
      <View
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}
      >
        <Text variant="h3">{QUEST_COPY.title}</Text>
        <Text variant="micro" style={{ color: colors.textMuted }}>
          {`${QUEST_COPY.resetIn} `}
          <Text variant="micro" style={{ color: colors.textSecondary }}>
            {fmtWeekReset(msUntilWeekReset(new Date()))}
          </Text>
        </Text>
      </View>

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text variant="micro">{QUEST_COPY.completion}</Text>
          <Text variant="micro" style={{ color: theme.accent }}>
            {`${String(claimedCount)}/${String(total)} · ${String(pct)}%`}
          </Text>
        </View>
        <XPBar current={claimedCount} needed={Math.max(total, 1)} height={5} />
      </View>

      {main.map((quest) => {
        const done = quest.completed;
        return (
          <View key={quest.id} style={{ gap: 6 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <Text variant="h3" numberOfLines={2} style={{ flex: 1, fontSize: 13.5 }}>
                {quest.title}
              </Text>
              {reward(quest, colors.warning)}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <XPBar
                  current={Math.min(quest.progress, quest.target)}
                  needed={quest.target}
                  height={4}
                />
              </View>
              <Text
                variant="mono"
                style={{ fontSize: 11, color: done ? theme.accent : colors.textMuted }}
              >
                {`${String(Math.min(quest.progress, quest.target))}/${String(quest.target)}`}
              </Text>
            </View>
          </View>
        );
      })}

      {bonus !== null ? (
        <View
          style={{
            gap: 8,
            padding: 12,
            borderWidth: 1,
            borderColor: `${AMBER}66`,
            backgroundColor: `${AMBER}0D`,
          }}
        >
          <Text variant="micro" style={{ color: AMBER }}>
            {QUEST_COPY.bonusTitle(total)}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <Text variant="bodySm" style={{ flex: 1, color: colors.textPrimary }}>
              <Text style={{ color: AMBER, fontFamily: `${fonts.sans}_700Bold` }}>
                {QUEST_COPY.reward(bonus.xpReward)}
              </Text>
              {`${QUEST_COPY.bonusFreeze(bonus.freezeReward)} · `}
              <Text style={{ color: colors.textSecondary }}>
                {QUEST_COPY.claimedXp(claimedXp, totalXp)}
              </Text>
            </Text>
            {bonus.claimed || bonus.completed ? reward(bonus, AMBER) : null}
          </View>
        </View>
      ) : null}

      {feedback !== null ? (
        <Text
          variant="bodySm"
          accessibilityRole={feedback.tone === "error" ? "alert" : undefined}
          accessibilityLiveRegion="polite"
          style={{ color: feedback.tone === "error" ? colors.danger : colors.success }}
        >
          {feedback.text}
        </Text>
      ) : null}

      {levelUp !== null ? (
        <LevelUpOverlay level={levelUp} onClose={() => setLevelUp(null)} />
      ) : null}
    </Card>
  );
}
