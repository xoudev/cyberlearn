import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { type FindTheFlaw, flawLines } from "@cyberlearn/types";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * The site's <FindTheFlaw>, played in the app: tap the vulnerable line, then
 * the name of the flaw. Same steps, same hint after a second wrong line, same
 * explanation once found; nothing is sent anywhere.
 */

type Stage = "line" | "name" | "done";

const RED = colors.danger;

export function FindTheFlawExercise({ flaw }: { flaw: FindTheFlaw }): React.JSX.Element {
  const { theme } = useCosmetics();
  const [stage, setStage] = useState<Stage>("line");
  const [wrongLines, setWrongLines] = useState<number[]>([]);
  const [wrongOptions, setWrongOptions] = useState<number[]>([]);
  const lines = flawLines(flaw.code);
  const width = String(lines.length).length;
  const found = stage !== "line";

  const pickLine = (n: number): void => {
    if (stage !== "line") return;
    if (n === flaw.line) setStage("name");
    else if (!wrongLines.includes(n)) setWrongLines([...wrongLines, n]);
  };
  const pickOption = (i: number): void => {
    if (stage !== "name") return;
    if (i === flaw.correct) setStage("done");
    else if (!wrongOptions.includes(i)) setWrongOptions([...wrongOptions, i]);
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
          TROUVE LA FAILLE
        </Text>
        {flaw.title !== undefined ? (
          <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
            {flaw.title}
          </Text>
        ) : null}
      </View>

      <View style={{ padding: 12, gap: 10 }}>
        <Text variant="bodySm">
          {stage === "line"
            ? "Touche la ligne vulnérable."
            : "Ligne trouvée. Quelle est cette faille ?"}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ backgroundColor: theme.terminal.background }}
        >
          <View style={{ paddingVertical: 6 }}>
            {lines.map((text, i) => {
              const n = i + 1;
              const isFlaw = found && n === flaw.line;
              const isWrong = wrongLines.includes(n);
              const blank = text.trim() === "";
              return (
                <Pressable
                  key={n}
                  onPress={() => {
                    pickLine(n);
                  }}
                  disabled={blank || stage !== "line"}
                  accessibilityRole="button"
                  accessibilityLabel={`Ligne ${String(n)} : ${text.trim()}`}
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    paddingHorizontal: 10,
                    paddingVertical: 2,
                    borderLeftWidth: 3,
                    borderLeftColor: isFlaw ? theme.accent : isWrong ? RED : "transparent",
                    backgroundColor: isFlaw
                      ? `${theme.accent}1F`
                      : isWrong
                        ? `${RED}1A`
                        : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: `${fonts.mono}_400Regular`,
                      fontSize: 12,
                      lineHeight: 20,
                      color: colors.textDisabled,
                    }}
                  >
                    {String(n).padStart(width, " ")}
                  </Text>
                  <Text
                    style={{
                      fontFamily: `${fonts.mono}_400Regular`,
                      fontSize: 12,
                      lineHeight: 20,
                      color: theme.terminal.foreground,
                    }}
                  >
                    {text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {stage === "line" && wrongLines.length > 0 ? (
          <Text variant="bodySm" style={{ color: RED }}>
            Pas celle-ci : relis ce que fait chaque ligne avec ce qui vient de l&apos;extérieur.
          </Text>
        ) : null}
        {stage === "line" && wrongLines.length >= 2 && flaw.hint !== undefined ? (
          <Text variant="bodySm">Indice : {flaw.hint}</Text>
        ) : null}

        {found ? (
          <View style={{ gap: 8 }}>
            {flaw.options.map((option, i) => {
              const right = stage === "done" && i === flaw.correct;
              const wrong = wrongOptions.includes(i);
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    pickOption(i);
                  }}
                  disabled={stage === "done" || wrong}
                  accessibilityRole="button"
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: right ? theme.accent : wrong ? RED : colors.borderDefault,
                    backgroundColor: right ? `${theme.accent}1A` : "transparent",
                  }}
                >
                  <Text
                    variant="bodySm"
                    style={{ color: wrong ? colors.textMuted : colors.textPrimary }}
                  >
                    {option}
                    {wrong ? " : non" : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {stage === "done" ? (
          <View style={{ gap: 8 }}>
            <Text variant="bodySm" style={{ lineHeight: 20 }}>
              <Text
                variant="bodySm"
                style={{ color: theme.accent, fontFamily: `${fonts.sans}_700Bold` }}
              >
                Trouvé.{" "}
              </Text>
              {flaw.explanation}
            </Text>
            <Pressable
              onPress={() => {
                setStage("line");
                setWrongLines([]);
                setWrongOptions([]);
              }}
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
                Recommencer
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}
