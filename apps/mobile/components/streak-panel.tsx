import { useQuery } from "@tanstack/react-query";
import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, fonts } from "@cyberlearn/tokens";
import { ActivityCalendar } from "@/components/activity-calendar";
import { Card, Text } from "@/components/ui";
import { fetchStreakApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import { STREAK_COPY, nextMilestone } from "@/lib/streak";

const AMBER = "#FFB547";

/**
 * The site's streak panel (dashboard and profile): the series and whether it
 * holds, the record, the days active this year, the next milestone, a year of
 * activity day by day, and the streak-freezes in reserve. The calendar scrolls
 * sideways and opens on the current week, as the site's does on a narrow
 * screen.
 */
export function StreakPanel({ userId }: { userId: string | undefined }): React.JSX.Element | null {
  const { theme } = useCosmetics();
  const { data } = useQuery({
    queryKey: ["streak", userId],
    enabled: Boolean(userId),
    queryFn: fetchStreakApi,
    staleTime: 60_000,
  });
  if (!data) return null;

  const next = nextMilestone(data.currentStreak);
  const tone = data.active ? theme.accent : colors.textMuted;

  return (
    <Card style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: data.active ? `${theme.accent}26` : colors.bgBase,
              borderWidth: 1,
              borderColor: data.active ? `${theme.accent}66` : colors.borderDefault,
            }}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d="M13 2 L4 14 H11 L10 22 L19 9 H12 Z" fill={tone} />
            </Svg>
          </View>
          <View>
            <Text style={{ fontFamily: `${fonts.sans}_800ExtraBold`, fontSize: 26, color: tone }}>
              {data.currentStreak}{" "}
              <Text variant="micro" style={{ color: colors.textMuted }}>
                {STREAK_COPY.days}
              </Text>
            </Text>
            <Text variant="micro" style={{ color: data.active ? theme.accent : colors.warning }}>
              {data.active ? STREAK_COPY.active : STREAK_COPY.broken}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text variant="micro">{STREAK_COPY.record}</Text>
          <Text style={{ fontFamily: `${fonts.sans}_800ExtraBold`, fontSize: 20, color: AMBER }}>
            {data.longestStreak}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {[
          {
            label: STREAK_COPY.personalBest,
            value: STREAK_COPY.daysValue(data.longestStreak),
            color: AMBER,
          },
          {
            label: STREAK_COPY.thisYear,
            value: STREAK_COPY.daysValue(data.daysThisYear),
            color: colors.textPrimary,
          },
          {
            label: STREAK_COPY.nextMilestone,
            value: STREAK_COPY.milestoneValue(next),
            color: theme.accent,
          },
        ].map((stat) => (
          <View key={stat.label} style={{ flex: 1, gap: 3 }}>
            <Text variant="micro" style={{ fontSize: 9 }}>
              {stat.label}
            </Text>
            <Text style={{ fontFamily: `${fonts.sans}_700Bold`, fontSize: 17, color: stat.color }}>
              {stat.value}
            </Text>
          </View>
        ))}
      </View>

      <ActivityCalendar activity={data.activity} daysThisYear={data.daysThisYear} />

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          padding: 12,
          borderWidth: 1,
          borderColor: `${theme.accent}40`,
          backgroundColor: `${theme.accent}0A`,
        }}
      >
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path
            d="M12 2 V22 M2 12 H22 M5 5 L19 19 M19 5 L5 19"
            stroke={theme.accent}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="h3" style={{ fontSize: 13 }}>
            {`${STREAK_COPY.freezeTitle} · `}
            <Text style={{ color: theme.accent }}>{STREAK_COPY.freezeCount(data.freezes)}</Text>
          </Text>
          <Text variant="bodySm">{STREAK_COPY.freezeNote}</Text>
        </View>
      </View>
    </Card>
  );
}
