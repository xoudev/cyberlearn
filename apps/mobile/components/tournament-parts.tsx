import React from "react";
import { View, type ViewStyle } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import {
  placeLabel,
  TOURNAMENT_PHASE_LABELS,
  type TournamentPhase,
} from "@cyberlearn/lib/challenges/tournament";
import { Pill, Text } from "@/components/ui";
import { medalColor, PHASE_COLOR, TOURNAMENT_ACCENT } from "@/lib/tournaments";

/**
 * The pieces the three tournament screens draw alike: a section's count, a
 * phase, the time window, a place on a podium, a difficulty, a figure with
 * its label, and the numbered facts that explain the scoring.
 */

/** A section's count, beside its `SectionLabel` title as the app's other lists put it. */
export function SectionCount({ text }: { text: string }): React.JSX.Element {
  return (
    <Text
      variant="mono"
      style={{
        flexShrink: 1,
        marginLeft: 10,
        fontSize: 11,
        color: colors.textMuted,
        textAlign: "right",
      }}
    >
      {text}
    </Text>
  );
}

/** A tournament's phase in words and in its colour. */
export function PhasePill({ phase }: { phase: TournamentPhase }): React.JSX.Element {
  return (
    <Pill
      label={TOURNAMENT_PHASE_LABELS[phase]}
      color={PHASE_COLOR[phase]}
      dot={PHASE_COLOR[phase]}
    />
  );
}

/** Said beside a scoreboard while it is read again every few seconds. */
export function LiveTag(): React.JSX.Element {
  return <Pill label="En direct" color={PHASE_COLOR.RUNNING} dot={PHASE_COLOR.RUNNING} />;
}

/** How much of the tournament's window has gone by, in its phase's colour, and what that means. */
export function WindowBar({
  share,
  phase,
  caption,
}: {
  /** From 0 to 1. */
  share: number;
  phase: TournamentPhase;
  caption: string;
}): React.JSX.Element {
  const percent = Math.floor(share * 100);
  return (
    <View style={{ gap: 6 }}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Temps écoulé"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={{
          height: 6,
          borderWidth: 1,
          borderColor: colors.borderDefault,
          backgroundColor: colors.bgBase,
          overflow: "hidden",
        }}
      >
        <View
          style={{ height: "100%", width: `${percent}%`, backgroundColor: PHASE_COLOR[phase] }}
        />
      </View>
      <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
        {caption}
      </Text>
    </View>
  );
}

/**
 * A place as a plate: "1er", "2e", the first three in the medal colours once
 * they have scored. Before anybody has scored, every team ties first: the
 * plate then says no place.
 */
export function PlacePlate({
  rank,
  scored,
  ranked = true,
}: {
  rank: number;
  scored: boolean;
  /** False while nobody has a point yet. */
  ranked?: boolean;
}): React.JSX.Element {
  const medal = ranked ? medalColor(rank, scored) : null;
  return (
    <View
      accessible
      accessibilityLabel={ranked ? placeLabel(rank) : "sans place"}
      style={{
        minWidth: 40,
        paddingHorizontal: 6,
        paddingVertical: 4,
        alignItems: "center",
        borderWidth: 1,
        borderColor: medal ?? colors.borderDefault,
        borderBottomWidth: medal !== null ? 3 : 1,
        backgroundColor: medal !== null ? `${medal}1a` : "transparent",
      }}
    >
      <Text
        style={{
          fontFamily: `${fonts.mono}_500Medium`,
          fontSize: 12,
          color: medal ?? colors.textSecondary,
        }}
      >
        {ranked ? placeLabel(rank) : "–"}
      </Text>
    </View>
  );
}

/** A difficulty as four squares, as many filled as its level; the word goes beside it. */
export function Pips({ level, color }: { level: number; color: string }): React.JSX.Element {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", gap: 3 }}
    >
      {[1, 2, 3, 4].map((n) => (
        <View
          key={n}
          style={{
            width: 7,
            height: 7,
            borderWidth: 1,
            borderColor: n <= level ? color : colors.borderDefault,
            backgroundColor: n <= level ? color : "transparent",
          }}
        />
      ))}
    </View>
  );
}

/**
 * A figure under its label: "Fin", "vendredi 16 octobre à 16:00"; the value
 * may be big. Two to a row by default, in a wrapping row.
 */
export function Figure({
  label,
  value,
  unit = null,
  note = null,
  big = false,
  color = colors.textPrimary,
  style,
}: {
  label: string;
  value: string;
  unit?: string | null;
  note?: string | null;
  big?: boolean;
  color?: string;
  style?: ViewStyle;
}): React.JSX.Element {
  return (
    <View style={[{ flexBasis: "45%", flexGrow: 1, gap: 4 }, style]}>
      <Text variant="micro">{label}</Text>
      <Text
        style={
          big
            ? { fontFamily: `${fonts.sans}_800ExtraBold`, fontSize: 22, color }
            : { fontFamily: `${fonts.sans}_600SemiBold`, fontSize: 14, color, lineHeight: 19 }
        }
      >
        {value}
        {unit !== null ? (
          <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
            {` ${unit}`}
          </Text>
        ) : null}
      </Text>
      {note !== null ? (
        <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

/** Facts numbered as the site numbers them: "01", "02", each a title and its text, or a text alone. */
export function NumberedFacts({
  facts,
}: {
  facts: readonly { title?: string; text: string }[];
}): React.JSX.Element {
  return (
    <View style={{ gap: 12 }}>
      {facts.map((fact, i) => (
        <View key={fact.text} style={{ flexDirection: "row", gap: 12 }}>
          <Text
            style={{
              fontFamily: `${fonts.mono}_500Medium`,
              fontSize: 12,
              color: TOURNAMENT_ACCENT,
            }}
          >
            {String(i + 1).padStart(2, "0")}
          </Text>
          <View style={{ flex: 1, gap: 2 }}>
            {fact.title !== undefined ? <Text variant="h3">{fact.title}</Text> : null}
            <Text variant="bodySm" style={{ color: colors.textSecondary }}>
              {fact.text}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
