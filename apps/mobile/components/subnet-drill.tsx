import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import {
  type DrillQuestion,
  drawSeries,
  isRightAnswer,
  type Rng,
} from "@cyberlearn/lib/network/subnet-drill";
import type { SubnetDrill } from "@cyberlearn/types";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * The site's <SubnetDrill>, played in the app: the same questions, drawn and
 * corrected by @cyberlearn/lib/network/subnet-drill. A typed answer gets a
 * second try before the correction, a yes-or-no none; the correction comes
 * with the reasoning; a series ends on how many were found. Nothing is sent
 * anywhere.
 */

type Outcome = "retry" | "right" | "revealed";

const RED = colors.danger;
const MONO = `${fonts.mono}_400Regular`;

export function SubnetDrillExercise({
  drill,
  rng = Math.random,
}: {
  drill: SubnetDrill;
  rng?: Rng;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const [series, setSeries] = useState<DrillQuestion[]>(() => drawSeries(drill, rng));
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [found, setFound] = useState(0);

  const question = series[index];
  const finished = index >= series.length;
  const answered = outcome === "right" || outcome === "revealed";

  const judge = (answer: string): void => {
    if (question === undefined || answered) return;
    if (isRightAnswer(question, answer)) {
      setOutcome("right");
      setFound((n) => n + 1);
    } else if (attempts === 0 && question.input !== "choice") {
      setAttempts(1);
      setOutcome("retry");
    } else {
      setOutcome("revealed");
    }
  };

  const next = (): void => {
    setIndex((i) => i + 1);
    setTyped("");
    setAttempts(0);
    setOutcome(null);
  };

  const restart = (): void => {
    setSeries(drawSeries(drill, rng));
    setIndex(0);
    setTyped("");
    setAttempts(0);
    setOutcome(null);
    setFound(0);
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
          CALCUL DE SOUS-RÉSEAUX
        </Text>
        {drill.title !== undefined ? (
          <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
            {drill.title}
          </Text>
        ) : null}
        {!finished ? (
          <Text variant="micro" style={{ color: colors.textMuted }}>
            Question {String(index + 1)} sur {String(series.length)}
          </Text>
        ) : null}
      </View>

      <View style={{ padding: 12, gap: 10 }}>
        {drill.task !== undefined ? (
          <Text variant="bodySm" style={{ color: colors.textSecondary }}>
            {drill.task}
          </Text>
        ) : null}

        {finished ? (
          <View style={{ gap: 8 }}>
            <Text variant="body">
              <Text
                variant="body"
                style={{ color: theme.accent, fontFamily: `${fonts.sans}_700Bold` }}
              >
                Série terminée :{" "}
              </Text>
              {String(found)} {found > 1 ? "trouvées" : "trouvée"} sur {String(series.length)}.
            </Text>
            <Text variant="bodySm" style={{ color: colors.textSecondary }}>
              {found === series.length
                ? "Tout juste. Une autre série, avec d'autres adresses, pour que ça devienne un réflexe ?"
                : "Refais une série : les mêmes sortes de questions, d'autres adresses."}
            </Text>
            <Pressable
              onPress={restart}
              accessibilityRole="button"
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: theme.accent,
              }}
            >
              <Text variant="bodySm" style={{ color: theme.accent }}>
                Nouvelle série
              </Text>
            </Pressable>
          </View>
        ) : null}

        {question !== undefined ? (
          <>
            <Text variant="body" style={{ lineHeight: 22 }}>
              {question.prompt}
            </Text>

            {question.input === "choice" ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                {question.choices.map((choice) => {
                  const right = answered && choice === question.answer;
                  const picked = answered && choice === typed;
                  return (
                    <Pressable
                      key={choice}
                      disabled={answered}
                      onPress={() => {
                        setTyped(choice);
                        judge(choice);
                      }}
                      accessibilityRole="button"
                      style={{
                        minWidth: 90,
                        alignItems: "center",
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderWidth: 1,
                        borderColor: right ? theme.accent : picked ? RED : colors.borderDefault,
                      }}
                    >
                      <Text
                        variant="bodySm"
                        style={{ color: right ? theme.accent : picked ? RED : colors.textPrimary }}
                      >
                        {choice}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 8, alignItems: "stretch" }}>
                <TextInput
                  value={typed}
                  onChangeText={(text) => {
                    setTyped(text);
                    if (outcome === "retry") setOutcome(null);
                  }}
                  onSubmitEditing={() => {
                    judge(typed);
                  }}
                  editable={!answered}
                  returnKeyType="done"
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  keyboardType={question.input === "address" ? "decimal-pad" : "number-pad"}
                  accessibilityLabel="Ta réponse"
                  placeholder={question.input === "address" ? "192.168.1.0" : "62"}
                  placeholderTextColor={colors.textDisabled}
                  style={{
                    flex: 1,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: colors.borderDefault,
                    color: colors.textPrimary,
                    fontFamily: MONO,
                    fontSize: 14,
                  }}
                />
                <Pressable
                  onPress={() => {
                    judge(typed);
                  }}
                  disabled={answered || typed.trim() === ""}
                  accessibilityRole="button"
                  style={{
                    justifyContent: "center",
                    paddingHorizontal: 14,
                    borderWidth: 1,
                    borderColor: theme.accent,
                    opacity: answered || typed.trim() === "" ? 0.6 : 1,
                  }}
                >
                  <Text variant="bodySm" style={{ color: theme.accent }}>
                    Vérifier
                  </Text>
                </Pressable>
              </View>
            )}

            {outcome === "retry" ? (
              <Text variant="bodySm" style={{ color: RED }}>
                Non, ce n&apos;est pas ça : essaie encore.
              </Text>
            ) : null}
            {answered ? (
              <View style={{ gap: 8 }}>
                <Text variant="bodySm" style={{ lineHeight: 20 }}>
                  <Text
                    variant="bodySm"
                    style={{
                      color: outcome === "right" ? theme.accent : RED,
                      fontFamily: `${fonts.sans}_700Bold`,
                    }}
                  >
                    {outcome === "right"
                      ? "Juste. "
                      : `Non : la bonne réponse est ${question.answer}. `}
                  </Text>
                  {question.explanation}
                </Text>
                <Pressable
                  onPress={next}
                  accessibilityRole="button"
                  style={{
                    alignSelf: "flex-start",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderWidth: 1,
                    borderColor: colors.borderDefault,
                  }}
                >
                  <Text variant="micro" style={{ color: colors.textSecondary }}>
                    {index + 1 < series.length ? "Question suivante" : "Voir le résultat"}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}
