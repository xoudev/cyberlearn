import React, { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import {
  defaultKey,
  type Direction,
  directionLabels,
  hasDirections,
  isAnswer,
  keyLabel,
  runTool,
  TOOL_NAMES,
  TOOL_NOTES,
} from "@cyberlearn/lib/crypto/workshop";
import type { CryptoTool, CryptoWorkshop } from "@cyberlearn/types";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * The site's <CryptoWorkshop>, played in the app: the same tools
 * (@cyberlearn/lib/crypto/workshop), answered as the learner types, and the
 * same message to decipher.
 */

const MONO = `${fonts.mono}_400Regular`;

export function CryptoWorkshopExercise({
  workshop,
}: {
  workshop: CryptoWorkshop;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const [chosenTool, setChosenTool] = useState<CryptoTool | null>(null);
  const [direction, setDirection] = useState<Direction>("encode");
  const [keys, setKeys] = useState<Partial<Record<CryptoTool, string>>>({});
  const [typed, setTyped] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);

  const tool = chosenTool ?? workshop.tools[0] ?? "base64";
  const key = keys[tool] ?? defaultKey(tool);
  const input = typed ?? workshop.input ?? "";
  const twoWays = hasDirections(tool);
  const result = runTool({ tool, direction: twoWays ? direction : "encode", input, key });
  const labels = directionLabels(tool);
  const keyName = keyLabel(tool);
  const challenge = workshop.challenge;

  const chipStyle = (active: boolean) => ({
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: active ? theme.accent : colors.borderDefault,
    backgroundColor: active ? theme.accent : "transparent",
  });
  const chipText = (active: boolean) => ({
    fontFamily: MONO,
    fontSize: 12,
    color: active ? colors.bgBase : colors.textSecondary,
  });
  const fieldStyle = {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    color: colors.textPrimary,
    fontFamily: MONO,
    fontSize: 13,
  };

  const takeOutput = (): void => {
    if (!result.ok) return;
    setTyped(result.output);
    if (twoWays) setDirection(direction === "encode" ? "decode" : "encode");
  };

  const propose = (): void => {
    if (challenge === undefined || solved || answer.trim() === "") return;
    if (isAnswer(challenge.answer, answer)) setSolved(true);
    else setAttempts((n) => n + 1);
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
          ATELIER CRYPTO
        </Text>
        {workshop.title !== undefined ? (
          <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
            {workshop.title}
          </Text>
        ) : null}
      </View>

      <View style={{ padding: 12, gap: 10 }}>
        {workshop.task !== undefined ? (
          <Text variant="bodySm" style={{ color: colors.textSecondary }}>
            {workshop.task}
          </Text>
        ) : null}

        {workshop.tools.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {workshop.tools.map((candidate) => (
                <Pressable
                  key={candidate}
                  onPress={() => {
                    setChosenTool(candidate);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: candidate === tool }}
                  style={chipStyle(candidate === tool)}
                >
                  <Text style={chipText(candidate === tool)}>{TOOL_NAMES[candidate]}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : null}
        <Text variant="bodySm" style={{ color: colors.textMuted, lineHeight: 19 }}>
          <Text variant="bodySm" style={{ color: colors.textSecondary }}>
            {TOOL_NAMES[tool]}.{" "}
          </Text>
          {TOOL_NOTES[tool]}
        </Text>

        {twoWays ? (
          <View style={{ flexDirection: "row", gap: 6 }}>
            {(["encode", "decode"] as const).map((way) => (
              <Pressable
                key={way}
                onPress={() => {
                  setDirection(way);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: direction === way }}
                style={chipStyle(direction === way)}
              >
                <Text style={chipText(direction === way)}>{labels[way]}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {keyName !== null ? (
          <View style={{ gap: 4 }}>
            <Text variant="micro" style={{ color: colors.textMuted }}>
              {keyName}
            </Text>
            <TextInput
              value={key}
              onChangeText={(text) => {
                setKeys({ ...keys, [tool]: text });
              }}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              accessibilityLabel={keyName}
              style={fieldStyle}
            />
          </View>
        ) : null}

        <TextInput
          value={input}
          onChangeText={setTyped}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          accessibilityLabel="Entrée"
          placeholder="Le texte à transformer"
          placeholderTextColor={colors.textDisabled}
          style={{ ...fieldStyle, minHeight: 64, textAlignVertical: "top" }}
        />
        {result.ok ? (
          <Text
            accessibilityLabel="Sortie"
            selectable
            style={{ ...fieldStyle, minHeight: 44, color: theme.accent }}
          >
            {result.output}
          </Text>
        ) : (
          <Text variant="bodySm" style={{ color: colors.danger }}>
            {result.problem}
          </Text>
        )}
        <Pressable
          onPress={takeOutput}
          disabled={!result.ok || result.output === ""}
          accessibilityRole="button"
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: colors.borderDefault,
            opacity: !result.ok || result.output === "" ? 0.5 : 1,
          }}
        >
          <Text variant="micro" style={{ color: colors.textSecondary }}>
            {twoWays
              ? "Reprendre la sortie comme entrée, dans l'autre sens"
              : "Reprendre la sortie"}
          </Text>
        </Pressable>

        {challenge !== undefined ? (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.borderSubtle,
              paddingTop: 10,
              gap: 8,
            }}
          >
            <Text variant="micro" style={{ color: colors.textMuted }}>
              MESSAGE À DÉCHIFFRER
            </Text>
            <Text selectable style={fieldStyle}>
              {challenge.ciphertext}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <Pressable
                onPress={() => {
                  setTyped(challenge.ciphertext);
                  if (twoWays) setDirection("decode");
                }}
                accessibilityRole="button"
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: colors.borderDefault,
                }}
              >
                <Text variant="micro" style={{ color: colors.textSecondary }}>
                  Mettre dans l&apos;entrée
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (result.ok) setAnswer(result.output);
                }}
                disabled={!result.ok || result.output === ""}
                accessibilityRole="button"
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: colors.borderDefault,
                  opacity: !result.ok || result.output === "" ? 0.5 : 1,
                }}
              >
                <Text variant="micro" style={{ color: colors.textSecondary }}>
                  Utiliser la sortie comme réponse
                </Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                value={answer}
                onChangeText={setAnswer}
                onSubmitEditing={propose}
                editable={!solved}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                accessibilityLabel="Ta réponse en clair"
                placeholder="Le message, en clair"
                placeholderTextColor={colors.textDisabled}
                style={{ ...fieldStyle, flex: 1 }}
              />
              <Pressable
                onPress={propose}
                disabled={solved || answer.trim() === ""}
                accessibilityRole="button"
                style={{
                  justifyContent: "center",
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: theme.accent,
                  opacity: solved || answer.trim() === "" ? 0.5 : 1,
                }}
              >
                <Text variant="bodySm" style={{ color: theme.accent }}>
                  Vérifier
                </Text>
              </Pressable>
            </View>
            {solved ? (
              <Text style={{ fontFamily: MONO, fontSize: 12, color: theme.accent }}>
                ✓ Déchiffré : c&apos;est bien le message.
              </Text>
            ) : attempts > 0 ? (
              <Text variant="bodySm" style={{ color: colors.danger }}>
                Non, ce n&apos;est pas encore ça.
                {challenge.hint !== undefined ? (
                  <Text variant="bodySm" style={{ color: colors.textSecondary }}>
                    {" "}
                    Indice : {challenge.hint}
                  </Text>
                ) : null}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
