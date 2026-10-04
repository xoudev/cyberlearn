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
import type { PutInOrder } from "@cyberlearn/types";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * The site's <PutInOrder>, played in the app: the same shuffled items
 * (@cyberlearn/lib/exercises/arrange), a tap to place the next one, a tap to
 * take one back, then a check that locks the right positions.
 */

const MONO = `${fonts.mono}_400Regular`;

export function PutInOrderExercise({ exercise }: { exercise: PutInOrder }): React.JSX.Element {
  const { theme } = useCosmetics();
  const count = exercise.items.length;
  const [placed, setPlaced] = useState<Slot[] | null>(null);
  const [locked, setLocked] = useState<boolean[]>([]);
  const [lastRight, setLastRight] = useState<number | null>(null);
  const [tries, setTries] = useState(0);

  const slots: Slot[] = placed ?? new Array<Slot>(count).fill(null);
  const order = shownOrder(count, exercise.id);
  const pool = remaining(order, slots);
  const done = locked.length === count && locked.every(Boolean);
  const complete = isComplete(slots);

  const place = (index: number): void => {
    const at = slots.indexOf(null);
    if (at === -1) return;
    const next = [...slots];
    next[at] = index;
    setPlaced(next);
  };

  const takeBack = (position: number): void => {
    if (locked[position] === true) return;
    const next = [...slots];
    next[position] = null;
    setPlaced(next);
  };

  const check = (): void => {
    const result = verdicts(slots);
    setLocked(result);
    setPlaced(keepRight(slots));
    setLastRight(result.filter(Boolean).length);
    setTries((t) => t + 1);
  };

  const restart = (): void => {
    setPlaced(null);
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
          DANS L&apos;ORDRE
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
          {slots.map((slot, position) => {
            const text = slot === null ? null : exercise.items[slot];
            const isLocked = locked[position] === true;
            return (
              <Pressable
                key={position}
                onPress={() => {
                  takeBack(position);
                }}
                disabled={text === null || isLocked}
                accessibilityRole="button"
                accessibilityLabel={
                  text === null
                    ? `Position ${String(position + 1)}, vide`
                    : `Position ${String(position + 1)} : ${text}${isLocked ? ", à la bonne place" : ", toucher pour retirer"}`
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderStyle: text === null ? "dashed" : "solid",
                  borderColor: isLocked ? theme.accent : colors.borderDefault,
                  backgroundColor: isLocked ? `${theme.accent}1A` : "transparent",
                }}
              >
                <Text
                  style={{ fontFamily: MONO, fontSize: 12, color: colors.textMuted, width: 20 }}
                >
                  {String(position + 1)}
                </Text>
                <Text
                  variant="bodySm"
                  style={{
                    flex: 1,
                    color: text === null ? colors.textDisabled : colors.textPrimary,
                  }}
                >
                  {text ?? "…"}
                </Text>
                {isLocked ? (
                  <Text style={{ fontFamily: MONO, color: theme.accent }}>✓</Text>
                ) : text !== null ? (
                  <Text variant="micro" style={{ color: colors.textSecondary }}>
                    Retirer
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {pool.length > 0 ? (
          <View style={{ gap: 6 }}>
            <Text variant="micro" style={{ color: colors.textMuted }}>
              À PLACER
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {pool.map((index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    place(index);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Placer : ${exercise.items[index] ?? ""}`}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: colors.borderDefault,
                  }}
                >
                  <Text variant="bodySm">{exercise.items[index]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {lastRight !== null && !done ? (
          <Text variant="bodySm" style={{ color: colors.danger }}>
            {String(lastRight)} sur {String(count)} à la bonne place. Les autres sont revenus en bas
            : replace-les.
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
              Dans l&apos;ordre.{" "}
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
