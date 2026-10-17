import React, { useRef } from "react";
import { ScrollView, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";
import {
  STREAK_COPY,
  WEEKDAY_LABELS,
  calendarColumns,
  streakCalendar,
  streakTodayKey,
} from "@/lib/streak";

const CELL = 10;
const GAP = 3;

/**
 * A year of activity, day by day: the calendar of the streak panel and of
 * somebody's profile, the site's grid with its levels and words. It scrolls
 * sideways and opens on the current week, as the site's does on a narrow
 * screen. Drawn in the accent of the cosmetics around it, the owner's on a
 * profile.
 */
export function ActivityCalendar({
  activity,
  daysThisYear,
  label = STREAK_COPY.lastYear,
}: {
  /** Activity count by day, "YYYY-MM-DD". */
  activity: Record<string, number>;
  daysThisYear: number;
  /** What a screen reader hears before the days active this year. */
  label?: string;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const calendar = useRef<ScrollView>(null);
  const { cells, monthLabels } = streakCalendar(activity, streakTodayKey());
  const columns = calendarColumns(cells);
  const heat = [colors.borderDefault, `${theme.accent}47`, `${theme.accent}8C`, theme.accent];

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="micro">{STREAK_COPY.lastYear}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text variant="micro" style={{ fontSize: 9 }}>
            {STREAK_COPY.less}
          </Text>
          {heat.map((color) => (
            <View key={color} style={{ width: CELL, height: CELL, backgroundColor: color }} />
          ))}
          <Text variant="micro" style={{ fontSize: 9 }}>
            {STREAK_COPY.more}
          </Text>
        </View>
      </View>

      <View
        style={{ flexDirection: "row" }}
        accessible
        accessibilityLabel={`${label} : ${String(daysThisYear)} jours actifs cette année`}
      >
        <View style={{ gap: GAP, paddingTop: 14, marginRight: 6 }}>
          {WEEKDAY_LABELS.map((day, row) => (
            <Text
              key={`weekday-${String(row)}`}
              variant="micro"
              style={{ fontSize: 8, height: CELL, lineHeight: CELL }}
            >
              {day}
            </Text>
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // Open on the current week, at the right-hand end, once laid out.
          ref={calendar}
          onContentSizeChange={() => calendar.current?.scrollToEnd({ animated: false })}
        >
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", gap: GAP, height: 10 }}>
              {monthLabels.map((month, w) => (
                <View key={`month-${String(w)}`} style={{ width: CELL }}>
                  {month !== "" ? (
                    <Text variant="micro" numberOfLines={1} style={{ fontSize: 8, width: 30 }}>
                      {month}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: GAP }}>
              {columns.map((week) => (
                <View key={week[0]?.key} style={{ gap: GAP }}>
                  {week.map((cell) => (
                    <View
                      key={cell.key}
                      style={{
                        width: CELL,
                        height: CELL,
                        backgroundColor: cell.future ? "transparent" : heat[cell.level],
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
