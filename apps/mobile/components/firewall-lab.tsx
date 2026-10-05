import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import {
  decide,
  describePacket,
  describeVerdict,
  type Packet,
  parseRules,
  RULE_SYNTAX,
  satisfies,
  type Verdict,
} from "@cyberlearn/lib/network/firewall";
import type { FirewallLab, FirewallProbe } from "@cyberlearn/types";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * The site's <FirewallLab>, played in the app: the same rules, read by
 * @cyberlearn/lib/network/firewall as they are typed, the same test packets
 * with their verdicts, and packets of the learner's own.
 */

const MONO = `${fonts.mono}_400Regular`;
const PROTOCOLS: Packet["proto"][] = ["tcp", "udp", "icmp"];

const packetOf = (probe: FirewallProbe): Packet => ({
  proto: probe.proto,
  from: probe.from,
  ...(probe.port === undefined ? {} : { port: probe.port }),
  state: probe.state,
});

export function FirewallLabExercise({ lab }: { lab: FirewallLab }): React.JSX.Element {
  const { theme } = useCosmetics();
  const [typed, setTyped] = useState<string | null>(null);
  const [extra, setExtra] = useState<Packet[]>([]);
  const [proto, setProto] = useState<Packet["proto"]>("tcp");
  const [from, setFrom] = useState("198.51.100.7");
  const [port, setPort] = useState("22");
  const [draftProblem, setDraftProblem] = useState<string | null>(null);
  const [showSyntax, setShowSyntax] = useState(false);

  const text = typed ?? lab.rules;
  const rules = parseRules(text);
  const ruleset = rules.ok ? rules.ruleset : null;
  const results = lab.probes.map((probe) => {
    const packet = packetOf(probe);
    const decision = ruleset === null ? null : decide(ruleset, packet);
    return {
      probe,
      packet,
      decision,
      ok: decision !== null && satisfies(decision.verdict, probe.expect),
    };
  });
  const right = results.filter((r) => r.ok).length;
  const done = ruleset !== null && right === results.length;
  const verdictColor = (verdict: Verdict): string =>
    verdict === "accept" ? theme.accent : colors.warning;

  const byWhom = (by: number | null): string => {
    if (ruleset === null) return "";
    if (by === null) return `par la politique ${ruleset.policy}`;
    const rule = ruleset.rules[by];
    return rule === undefined ? "" : `par la règle de la ligne ${String(rule.line)} : ${rule.text}`;
  };

  const send = (): void => {
    const number = Number(port);
    if (
      proto !== "icmp" &&
      (port.trim() === "" || !Number.isInteger(number) || number < 0 || number > 65535)
    ) {
      setDraftProblem("Le port est un nombre de 0 à 65535.");
      return;
    }
    if (!/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(from.trim())) {
      setDraftProblem("L'adresse source s'écrit en quatre nombres : 198.51.100.7.");
      return;
    }
    setDraftProblem(null);
    setExtra([
      ...extra,
      { proto, from: from.trim(), ...(proto === "icmp" ? {} : { port: number }), state: "new" },
    ]);
  };

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
    paddingHorizontal: 12,
    paddingVertical: 6,
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
          PARE-FEU
        </Text>
        {lab.title !== undefined ? (
          <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
            {lab.title}
          </Text>
        ) : null}
        <Text variant="micro" style={{ color: done ? theme.accent : colors.textMuted }}>
          {String(right)} / {String(results.length)} paquets font ce qu&apos;il faut
        </Text>
      </View>

      <View style={{ padding: 12, gap: 10 }}>
        <Text variant="bodySm" style={{ color: colors.textSecondary }}>
          {lab.task}
        </Text>

        <Text variant="micro" style={{ color: colors.textMuted }}>
          RÈGLES DE LA CHAÎNE D&apos;ENTRÉE
        </Text>
        <TextInput
          value={text}
          onChangeText={setTyped}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          accessibilityLabel="Règles du pare-feu"
          style={{ ...fieldStyle, minHeight: 120, textAlignVertical: "top", lineHeight: 20 }}
        />
        {rules.ok ? null : (
          <Text variant="bodySm" style={{ color: colors.danger }}>
            Ligne {String(rules.line)} : {rules.problem}
          </Text>
        )}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => {
              setShowSyntax(!showSyntax);
            }}
            accessibilityRole="button"
            style={smallButton}
          >
            <Text variant="micro" style={{ color: colors.textSecondary }}>
              Comment écrire une règle
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setTyped(null);
            }}
            disabled={text === lab.rules}
            accessibilityRole="button"
            style={{ ...smallButton, opacity: text === lab.rules ? 0.5 : 1 }}
          >
            <Text variant="micro" style={{ color: colors.textSecondary }}>
              Règles d&apos;origine
            </Text>
          </Pressable>
        </View>
        {showSyntax ? (
          <View style={{ gap: 4 }}>
            {RULE_SYNTAX.map((line) => (
              <Text
                key={line}
                style={{ fontFamily: MONO, fontSize: 12, color: colors.textSecondary }}
              >
                {line}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={{ gap: 6 }}>
          {results.map(({ probe, packet, decision, ok }) => (
            <View
              key={probe.label}
              style={{
                gap: 2,
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: ok ? theme.accent : colors.borderDefault,
                backgroundColor: ok ? `${theme.accent}14` : "transparent",
              }}
            >
              <Text variant="bodySm" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
                <Text style={{ fontFamily: MONO, color: ok ? theme.accent : colors.danger }}>
                  {ok ? "✓ " : "✗ "}
                </Text>
                {probe.label}
                <Text variant="micro" style={{ color: colors.textMuted }}>
                  {"  "}
                  {probe.expect === "accept" ? "doit passer" : "doit être bloqué"}
                </Text>
              </Text>
              <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.textSecondary }}>
                {describePacket(packet)}
              </Text>
              {decision === null ? (
                <Text variant="bodySm" style={{ color: colors.textMuted }}>
                  En attente de règles lisibles.
                </Text>
              ) : (
                <Text variant="bodySm" style={{ color: colors.textSecondary }}>
                  <Text variant="bodySm" style={{ color: verdictColor(decision.verdict) }}>
                    {describeVerdict(decision.verdict)}
                  </Text>{" "}
                  {byWhom(decision.by)}
                </Text>
              )}
            </View>
          ))}
        </View>

        <View
          style={{ borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: 10, gap: 8 }}
        >
          <Text variant="micro" style={{ color: colors.textMuted }}>
            ESSAYER UN PAQUET
          </Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {PROTOCOLS.map((candidate) => (
              <Pressable
                key={candidate}
                onPress={() => {
                  setProto(candidate);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: candidate === proto }}
                style={{
                  ...smallButton,
                  borderColor: candidate === proto ? theme.accent : colors.borderDefault,
                  backgroundColor: candidate === proto ? theme.accent : "transparent",
                }}
              >
                <Text
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    color: candidate === proto ? colors.bgBase : colors.textSecondary,
                  }}
                >
                  {candidate}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={from}
              onChangeText={setFrom}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="decimal-pad"
              accessibilityLabel="Adresse source"
              placeholder="198.51.100.7"
              placeholderTextColor={colors.textDisabled}
              style={{ ...fieldStyle, flex: 2 }}
            />
            {proto === "icmp" ? null : (
              <TextInput
                value={port}
                onChangeText={setPort}
                keyboardType="number-pad"
                accessibilityLabel="Port de destination"
                placeholder="22"
                placeholderTextColor={colors.textDisabled}
                style={{ ...fieldStyle, flex: 1 }}
              />
            )}
            <Pressable
              onPress={send}
              accessibilityRole="button"
              style={{ ...smallButton, justifyContent: "center", borderColor: theme.accent }}
            >
              <Text variant="bodySm" style={{ color: theme.accent }}>
                Envoyer
              </Text>
            </Pressable>
          </View>
          {draftProblem !== null ? (
            <Text variant="bodySm" style={{ color: colors.danger }}>
              {draftProblem}
            </Text>
          ) : null}
          {extra.map((packet, i) => {
            const decision = ruleset === null ? null : decide(ruleset, packet);
            return (
              <View key={`${describePacket(packet)}-${String(i)}`} style={{ gap: 2 }}>
                <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.textSecondary }}>
                  {describePacket(packet)}
                </Text>
                {decision === null ? null : (
                  <Text variant="bodySm" style={{ color: colors.textSecondary }}>
                    <Text variant="bodySm" style={{ color: verdictColor(decision.verdict) }}>
                      {describeVerdict(decision.verdict)}
                    </Text>{" "}
                    {byWhom(decision.by)}
                  </Text>
                )}
                <Pressable
                  onPress={() => {
                    setExtra(extra.filter((_, k) => k !== i));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Retirer : ${describePacket(packet)}`}
                  style={{ ...smallButton, alignSelf: "flex-start", paddingVertical: 2 }}
                >
                  <Text variant="micro" style={{ color: colors.textSecondary }}>
                    Retirer
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {done ? (
          <Text style={{ fontFamily: MONO, fontSize: 12, color: theme.accent }}>
            ✓ Pare-feu réglé : chaque paquet de test fait ce qu&apos;il faut.
          </Text>
        ) : null}

        {lab.hints !== undefined && lab.hints.length > 0 ? (
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
            {lab.hints.map((hint, i) => (
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
