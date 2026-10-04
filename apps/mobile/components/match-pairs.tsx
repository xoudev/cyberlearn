import React, { useState } from "react";
import { Pressable, View } from "react-native";
import {
  isComplete,
  keepRight,
  remaining,
  shownOrder,
  type Slot,
  verdicts,
} from "@cyberlearn/lib/exercises/arrange";
import type { MatchPairs } from "@cyberlearn/types";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * The site's <MatchPairs>, played in the app: the left column in order, the
 * right one shuffled the same way as on the site. A tap on a row chooses it, a
 * tap on an item of the right column fills the chosen row, a tap on a filled
 * row empties it; the check locks the right pairs.
 */

const MONO = `${fonts.mono}_400Regular`;

export function MatchPairsExercise({ exercise }: { exercise: MatchPairs }): React.JSX.Element {
  const { theme } = useCosmetics();
  const count = exercise.pairs.length;
  const [placed, setPlaced] = useState<Slot[] | null>(null);
  const [chosenRow, setChosenRow] = useState<number | null>(null);
  const [locked, setLocked] = useState<boolean[]>([]);
  const [lastRight, setLastRight] = useState<number | null>(null);
  const [tries, setTries] = useState(0);

  const slots: Slot[] = placed ?? new Array<Slot>(count).fill(null);
  const order = shownOrder(count, exercise.id);
  const pool = remaining(order, slots);
  const done = locked.length === count && locked.every(Boolean);
  const complete = isComplete(slots);
  const current = chosenRow !== null && slots[chosenRow] === null ? chosenRow : slots.indexOf(null);

  const fill = (index: number): void => {
    if (current === -1) return;
    const next = [...slots];
    next[current] = index;
    setPlaced(next);
    setChosenRow(null);
  };

  const tapRow = (row: number): void => {
    if (locked[row] === true) return;
    if (slots[row] === null) {
      setChosenRow(row);
      return;
    }
    const next = [...slots];
    next[row] = null;
    setPlaced(next);
    setChosenRow(row);
  };

  const check = (): void => {
    const result = verdicts(slots);
    setLocked(result);
    setPlaced(keepRight(slots));
    setLastRight(result.filter(Boolean).length);
    setTries((t) => t + 1);
    setChosenRow(null);
  };

  const restart = (): void => {
    setPlaced(null);
    setChosenRow(null);
    setLocked([]);
    setLastRight(null);
    setTries(0);
  };

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.borderDefault,
        borderTopWidth: 2,
        borderTopColor: theme.accent,
        backgroundColor: colors.bgElevated,
      }}
    >
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 2,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
        }}
      >
        <Text variant="micro" style={{ color: theme.accent }}>
          ASSOCIE
        </Text>
        {exercise.title !== undefined ? (
          <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
            {exercise.title}
          </Text>
        ) : null}
      </View>

      <View style={{ padding: 12, gap: 10 }}>
        <Text variant="bodySm" style={{ color: colors.textSecondary }}>
          {exercise.task}
        </Text>

        <View style={{ gap: 6 }}>
          {exercise.pairs.map((pair, row) => {
            const slot = slots[row] ?? null;
            const text = slot === null ? null : exercise.pairs[slot]?.right;
            const isLocked = locked[row] === true;
            const isCurrent = row === current && !done;
            return (
              <Pressable
                key={pair.left}
                onPress={() => {
                  tapRow(row);
                }}
                disabled={isLocked}
                accessibilityRole="button"
                accessibilityLabel={`${pair.left} : ${text ?? "à remplir"}${isLocked ? ", juste" : ""}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: isLocked
                    ? theme.accent
                    : isCurrent
                      ? colors.textSecondary
                      : colors.borderDefault,
                  backgroundColor: isLocked ? `${theme.accent}1A` : "transparent",
                }}
              >
                <Text variant="bodySm" style={{ flex: 2 }}>
                  {pair.left}
                </Text>
                <Text style={{ color: colors.textDisabled }}>→</Text>
                <Text
                  variant="bodySm"
                  style={{
                    flex: 3,
                    color:
                      text === null || text === undefined
                        ? colors.textDisabled
                        : colors.textPrimary,
                  }}
                >
                  {text ?? "…"}
                </Text>
                {isLocked ? <Text style={{ fontFamily: MONO, color: theme.accent }}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>

        {pool.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {pool.map((index) => (
              <Pressable
                key={index}
                onPress={() => {
                  fill(index);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Associer : ${exercise.pairs[index]?.right ?? ""}`}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: colors.borderDefault,
                }}
              >
                <Text variant="bodySm">{exercise.pairs[index]?.right}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {lastRight !== null && !done ? (
          <Text variant="bodySm" style={{ color: colors.danger }}>
            {String(lastRight)} sur {String(count)} associations justes. Les autres sont revenues en
            bas : réessaie.
          </Text>
        ) : null}
        {tries > 0 && !done && exercise.hint !== undefined ? (
          <Text variant="bodySm">Indice : {exercise.hint}</Text>
        ) : null}
        {done ? (
          <Text variant="bodySm" style={{ lineHeight: 20 }}>
            <Text
              variant="bodySm"
              style={{ color: theme.accent, fontFamily: `${fonts.sans}_700Bold` }}
            >
              Tout est associé.{" "}
            </Text>
            {exercise.explanation ?? ""}
          </Text>
        ) : null}

        <View style={{ flexDirection: "row", gap: 8 }}>
          {!done ? (
            <Pressable
              onPress={check}
              disabled={!complete}
              accessibilityRole="button"
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: theme.accent,
                opacity: complete ? 1 : 0.5,
              }}
            >
              <Text variant="bodySm" style={{ color: theme.accent }}>
                Vérifier
              </Text>
            </Pressable>
          ) : null}
          {tries > 0 ? (
            <Pressable
              onPress={restart}
              accessibilityRole="button"
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: colors.borderDefault,
              }}
            >
              <Text variant="micro" style={{ color: colors.textSecondary }}>
                Recommencer
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
