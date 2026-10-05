import React, { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import {
  asciiOf,
  hex2,
  identify,
  isFileAnswer,
  parseBytes,
  printableRuns,
  repairsMet,
} from "@cyberlearn/lib/files/hex";
import type { HexEditor } from "@cyberlearn/types";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * The site's <HexEditor>, played in the app: the same bytes, eight to a row,
 * the format they announce, a byte rewritten from a field, the strings in the
 * file, the repairs and the questions.
 */

const MONO = `${fonts.mono}_400Regular`;
const BYTES_PER_ROW = 8;

type Verdict = "right" | "wrong";

export function HexEditorExercise({ editor }: { editor: HexEditor }): React.JSX.Element {
  const { theme } = useCosmetics();
  const [edits, setEdits] = useState<Record<number, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [verdicts, setVerdicts] = useState<Record<string, Verdict | undefined>>({});

  const original = parseBytes(editor.bytes) ?? [];
  const bytes = original.map((b, i) => edits[i] ?? b);
  const kind = identify(bytes);
  const runs = printableRuns(bytes);
  const repairs = editor.repairs ?? [];
  const met = repairsMet(bytes, repairs);
  const questions = editor.questions ?? [];
  const done =
    (repairs.length > 0 || questions.length > 0) &&
    met.every(Boolean) &&
    questions.every((q) => verdicts[q.label] === "right");

  const select = (offset: number): void => {
    setSelected(offset);
    setDraft(hex2(bytes[offset] ?? 0));
  };

  const write = (): void => {
    if (selected === null || !editor.editable) return;
    const value = parseBytes(draft);
    if (value?.length !== 1) return;
    const byte = value[0] ?? 0;
    // The edits minus this byte, then this byte again if it differs from the original.
    const next: Record<number, number> = {};
    for (const [key, kept] of Object.entries(edits)) {
      if (Number(key) !== selected) next[Number(key)] = kept;
    }
    if (byte !== original[selected]) next[selected] = byte;
    setEdits(next);
  };

  const rows: number[] = [];
  for (let at = 0; at < bytes.length; at += BYTES_PER_ROW) rows.push(at);

  const fieldStyle = {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    color: colors.textPrimary,
    fontFamily: MONO,
    fontSize: 13,
  };
  const smallButton = {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.borderDefault,
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
          ÉDITEUR HEXADÉCIMAL
        </Text>
        {editor.title !== undefined ? (
          <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
            {editor.title}
          </Text>
        ) : null}
        <Text variant="micro" style={{ color: colors.textMuted }}>
          {editor.filename !== undefined ? `${editor.filename} · ` : ""}
          {String(bytes.length)} octets
        </Text>
      </View>

      <View style={{ padding: 12, gap: 10 }}>
        <Text variant="bodySm" style={{ color: colors.textSecondary }}>
          {editor.task}
        </Text>

        <Text variant="bodySm" style={{ color: colors.textSecondary }}>
          <Text variant="micro" style={{ color: colors.textMuted }}>
            TYPE RÉEL{"  "}
          </Text>
          {kind === null ? (
            <Text variant="bodySm" style={{ color: colors.warning }}>
              aucune signature connue à l&apos;octet 0
            </Text>
          ) : (
            <>
              <Text
                variant="bodySm"
                style={{ color: theme.accent, fontFamily: `${fonts.sans}_700Bold` }}
              >
                {kind.name}
              </Text>
              <Text style={{ fontFamily: MONO, fontSize: 12 }}>
                {" "}
                ({kind.magic.map(hex2).join(" ")})
              </Text>
              . {kind.note}
            </>
          )}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ backgroundColor: theme.terminal.background }}
        >
          <View style={{ padding: 8, gap: 3 }}>
            {rows.map((at) => (
              <View key={at} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text
                  style={{ fontFamily: MONO, fontSize: 12, color: colors.textDisabled, width: 44 }}
                >
                  {at.toString(16).padStart(4, "0")}
                </Text>
                <View style={{ flexDirection: "row", gap: 3 }}>
                  {bytes.slice(at, at + BYTES_PER_ROW).map((byte, k) => {
                    const offset = at + k;
                    const changed = edits[offset] !== undefined;
                    const isSelected = selected === offset;
                    return (
                      <Pressable
                        key={offset}
                        onPress={() => {
                          select(offset);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Octet ${String(offset)} : ${hex2(byte)}${changed ? ", modifié" : ""}`}
                        accessibilityState={{ selected: isSelected }}
                        style={{
                          width: 30,
                          paddingVertical: 4,
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: isSelected
                            ? theme.accent
                            : changed
                              ? colors.warning
                              : "transparent",
                          backgroundColor: isSelected ? `${theme.accent}40` : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: MONO,
                            fontSize: 13,
                            color: changed ? colors.warning : colors.textSecondary,
                          }}
                        >
                          {hex2(byte)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.textMuted }}>
                  {bytes
                    .slice(at, at + BYTES_PER_ROW)
                    .map((b) => asciiOf(b))
                    .join("")}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {editor.editable ? (
          <View style={{ gap: 6 }}>
            <Text variant="micro" style={{ color: colors.textSecondary }}>
              {selected === null
                ? "Touche un octet pour le modifier."
                : `Octet ${String(selected)} : ${hex2(original[selected] ?? 0)} à l'origine`}
            </Text>
            {selected !== null ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={write}
                  maxLength={2}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Nouvelle valeur (hexadécimal)"
                  style={{ ...fieldStyle, width: 64 }}
                />
                <Pressable
                  onPress={write}
                  disabled={(parseBytes(draft) ?? []).length !== 1}
                  accessibilityRole="button"
                  style={{ ...smallButton, justifyContent: "center", borderColor: theme.accent }}
                >
                  <Text variant="bodySm" style={{ color: theme.accent }}>
                    Écrire
                  </Text>
                </Pressable>
                {Object.keys(edits).length > 0 ? (
                  <Pressable
                    onPress={() => {
                      setEdits({});
                      setDraft(hex2(original[selected] ?? 0));
                    }}
                    accessibilityRole="button"
                    style={{ ...smallButton, justifyContent: "center" }}
                  >
                    <Text variant="micro" style={{ color: colors.textSecondary }}>
                      Rétablir l&apos;original
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {runs.length > 0 ? (
          <View style={{ gap: 4 }}>
            <Text variant="micro" style={{ color: colors.textMuted }}>
              TEXTE LISIBLE DANS LES OCTETS
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {runs.map((run) => (
                <Pressable
                  key={run.offset}
                  onPress={() => {
                    select(run.offset);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Octet ${String(run.offset)} : ${run.text}`}
                  style={smallButton}
                >
                  <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.textSecondary }}>
                    <Text style={{ color: colors.textMuted }}>
                      {run.offset.toString(16).padStart(4, "0")}{" "}
                    </Text>
                    {run.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {repairs.map((repair, i) => (
          <Text
            key={repair.label}
            style={{
              fontFamily: MONO,
              fontSize: 12,
              color: met[i] === true ? theme.accent : colors.textSecondary,
            }}
          >
            {met[i] === true ? "✓" : "○"} {repair.label}
            <Text style={{ color: colors.textMuted }}> (octet {String(repair.offset)})</Text>
          </Text>
        ))}

        {questions.length > 0 ? (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.borderSubtle,
              paddingTop: 10,
              gap: 10,
            }}
          >
            {questions.map((question) => {
              const verdict = verdicts[question.label];
              const check = (): void => {
                setVerdicts({
                  ...verdicts,
                  [question.label]: isFileAnswer(question.answer, answers[question.label] ?? "")
                    ? "right"
                    : "wrong",
                });
              };
              return (
                <View key={question.label} style={{ gap: 6 }}>
                  <Text variant="bodySm">
                    {verdict === "right" ? (
                      <Text style={{ fontFamily: MONO, color: theme.accent }}>✓ </Text>
                    ) : null}
                    {question.label}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      value={answers[question.label] ?? ""}
                      onChangeText={(value) => {
                        setAnswers({ ...answers, [question.label]: value });
                        if (verdict === "wrong")
                          setVerdicts({ ...verdicts, [question.label]: undefined });
                      }}
                      onSubmitEditing={check}
                      editable={verdict !== "right"}
                      autoCapitalize="none"
                      autoCorrect={false}
                      accessibilityLabel={question.label}
                      style={{ ...fieldStyle, flex: 1 }}
                    />
                    <Pressable
                      onPress={check}
                      disabled={
                        verdict === "right" || (answers[question.label] ?? "").trim() === ""
                      }
                      accessibilityRole="button"
                      style={{
                        justifyContent: "center",
                        paddingHorizontal: 12,
                        borderWidth: 1,
                        borderColor: theme.accent,
                      }}
                    >
                      <Text variant="bodySm" style={{ color: theme.accent }}>
                        Vérifier
                      </Text>
                    </Pressable>
                  </View>
                  {verdict === "wrong" ? (
                    <Text variant="bodySm" style={{ color: colors.danger }}>
                      Non, ce n&apos;est pas ça.
                      {question.hint !== undefined ? (
                        <Text variant="bodySm" style={{ color: colors.textSecondary }}>
                          {" "}
                          Indice : {question.hint}
                        </Text>
                      ) : null}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {done ? (
          <Text style={{ fontFamily: MONO, fontSize: 12, color: theme.accent }}>
            ✓ Exercice complété : le fichier dit ce qu&apos;il devait dire.
          </Text>
        ) : null}

        {editor.hints !== undefined && editor.hints.length > 0 ? (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.borderSubtle,
              paddingTop: 10,
              gap: 4,
            }}
          >
            <Text variant="micro" style={{ color: colors.textMuted }}>
              INDICES
            </Text>
            {editor.hints.map((hint, i) => (
              <Text key={hint} variant="bodySm" style={{ color: colors.textSecondary }}>
                {String(i + 1)}. {hint}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
