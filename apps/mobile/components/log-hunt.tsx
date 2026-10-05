import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import {
  buildLog,
  clockOf,
  countBy,
  FIELD_NAMES,
  type FieldFilter,
  filterEvents,
  isLogAnswer,
  type LogField,
} from "@cyberlearn/lib/logs/hunt";
import type { LogHunt } from "@cyberlearn/types";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * The site's <LogHunt>, played in the app: the same table of events, drawn by
 * @cyberlearn/lib/logs/hunt, a text filter, a count by field, a tap on a
 * value to filter on it, and the questions.
 */

const MONO = `${fonts.mono}_400Regular`;
const ROWS_SHOWN = 60;
const COUNT_FIELDS: readonly LogField[] = ["ip", "user", "action", "source", "host"];
const CELL_FIELDS = ["source", "host", "ip", "user", "action"] as const;

type Verdict = "right" | "wrong";

export function LogHuntExercise({ hunt }: { hunt: LogHunt }): React.JSX.Element {
  const { theme } = useCosmetics();
  const log = useMemo(() => buildLog(hunt), [hunt]);
  const [text, setText] = useState("");
  const [filters, setFilters] = useState<FieldFilter[]>([]);
  const [countField, setCountField] = useState<LogField | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [verdicts, setVerdicts] = useState<Record<string, Verdict | undefined>>({});

  const shown = filterEvents(log, text, filters);
  const counts = countField === null ? [] : countBy(shown, countField).slice(0, 10);
  const done = hunt.questions.every((q) => verdicts[q.label] === "right");

  const addFilter = (f: LogField, value: string): void => {
    if (filters.some((x) => x.field === f && x.value === value)) return;
    setFilters([...filters, { field: f, value }]);
  };

  const check = (label: string, expected: string | string[]): void => {
    setVerdicts({
      ...verdicts,
      [label]: isLogAnswer(expected, answers[label] ?? "") ? "right" : "wrong",
    });
  };

  const chip = (active: boolean) => ({
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: active ? theme.accent : colors.borderDefault,
    backgroundColor: active ? theme.accent : "transparent",
  });
  const chipText = (active: boolean) => ({
    fontFamily: MONO,
    fontSize: 11,
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
          CHASSE DANS LES LOGS
        </Text>
        {hunt.title !== undefined ? (
          <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
            {hunt.title}
          </Text>
        ) : null}
        <Text variant="micro" style={{ color: colors.textMuted }}>
          {String(shown.length)} événements sur {String(log.length)}
        </Text>
      </View>

      <View style={{ padding: 12, gap: 10 }}>
        <Text variant="bodySm" style={{ color: colors.textSecondary }}>
          {hunt.task}
        </Text>

        <TextInput
          value={text}
          onChangeText={setText}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Filtre texte"
          placeholder="Filtrer : une adresse, un compte, un mot"
          placeholderTextColor={colors.textDisabled}
          style={fieldStyle}
        />

        <View style={{ gap: 4 }}>
          <Text variant="micro" style={{ color: colors.textMuted }}>
            COMPTER PAR
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {COUNT_FIELDS.map((f) => (
              <Pressable
                key={f}
                onPress={() => {
                  setCountField(countField === f ? null : f);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: countField === f }}
                style={chip(countField === f)}
              >
                <Text style={chipText(countField === f)}>{FIELD_NAMES[f].toLowerCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {filters.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {filters.map((f) => (
              <Pressable
                key={`${f.field}=${f.value}`}
                onPress={() => {
                  setFilters(filters.filter((x) => x !== f));
                }}
                accessibilityRole="button"
                accessibilityLabel={`Retirer le filtre ${FIELD_NAMES[f.field]} = ${f.value}`}
                style={{ ...chip(false), borderColor: theme.accent }}
              >
                <Text style={{ ...chipText(false), color: colors.textPrimary }}>
                  {FIELD_NAMES[f.field]} = {f.value} ×
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {countField !== null ? (
          <View style={{ gap: 2 }}>
            {counts.map(({ value, count }) => (
              <Pressable
                key={value}
                onPress={() => {
                  addFilter(countField, value);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Filtrer : ${FIELD_NAMES[countField]} = ${value}`}
                style={{ flexDirection: "row", gap: 10 }}
              >
                <Text
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    color: theme.accent,
                    width: 44,
                    textAlign: "right",
                  }}
                >
                  {String(count)}
                </Text>
                <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.textSecondary }}>
                  {value}
                </Text>
              </Pressable>
            ))}
            {counts.length === 0 ? (
              <Text variant="micro" style={{ color: colors.textMuted }}>
                aucune valeur
              </Text>
            ) : null}
          </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ backgroundColor: theme.terminal.background }}
        >
          <View style={{ padding: 8, gap: 4 }}>
            {shown.slice(0, ROWS_SHOWN).map((event, i) => (
              <View
                key={`${event.time}-${String(i)}`}
                style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
              >
                <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.textMuted }}>
                  {clockOf(event.time)}
                </Text>
                {CELL_FIELDS.map((f) => {
                  const value = event[f];
                  return value === undefined ? null : (
                    <Pressable
                      key={f}
                      onPress={() => {
                        addFilter(f, value);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Filtrer : ${FIELD_NAMES[f]} = ${value}`}
                    >
                      <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.textSecondary }}>
                        {value}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            {shown.length > ROWS_SHOWN ? (
              <Text variant="micro" style={{ color: colors.textMuted }}>
                … et {String(shown.length - ROWS_SHOWN)} autres lignes : affine le filtre, ou
                compte.
              </Text>
            ) : null}
            {shown.length === 0 ? (
              <Text variant="micro" style={{ color: colors.textMuted }}>
                Aucun événement ne correspond.
              </Text>
            ) : null}
          </View>
        </ScrollView>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.borderSubtle,
            paddingTop: 10,
            gap: 10,
          }}
        >
          {hunt.questions.map((question) => {
            const verdict = verdicts[question.label];
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
                    onSubmitEditing={() => {
                      check(question.label, question.answer);
                    }}
                    editable={verdict !== "right"}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel={question.label}
                    style={{ ...fieldStyle, flex: 1 }}
                  />
                  <Pressable
                    onPress={() => {
                      check(question.label, question.answer);
                    }}
                    disabled={verdict === "right" || (answers[question.label] ?? "").trim() === ""}
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
          {done ? (
            <Text style={{ fontFamily: MONO, fontSize: 12, color: theme.accent }}>
              ✓ Enquête bouclée : toutes les réponses sont justes.
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
