import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import {
  ALPHABET,
  ALPHABETS,
  type AlphabetId,
  type AttackMethod,
  type AttackResult,
  ATTACK_METHODS,
  candidatesFor,
  type CrackedAccount,
  DICTIONARY_LEVELS,
  DICTIONARY_NAMES,
  DICTIONARY_NOTES,
  type DictionaryLevel,
  estimate,
  formatDuration,
  type FunctionId,
  GUESS_FUNCTION,
  GUESS_FUNCTIONS,
  groupDigits,
  METHOD_NAMES,
  METHOD_NOTES,
  observations,
  realDictionaryRows,
  runAttack,
  runSummary,
  secondsToTry,
  shortHash,
  STRENGTH_LABELS,
  type Strength,
} from "@cyberlearn/lib/crypto/cracking";
import type { PasswordLab } from "@cyberlearn/types";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * The site's <PasswordLab>, played in the app: the same table of sample
 * accounts, the same dictionary attack run on the phone
 * (@cyberlearn/lib/crypto/cracking), the same calculator of length and
 * slowness, the same closing question. Nothing leaves the phone.
 */

const MONO = `${fonts.mono}_400Regular`;
const BOLD = `${fonts.sans}_700Bold`;

export function PasswordLabExercise({ lab }: { lab: PasswordLab }): React.JSX.Element {
  const { theme } = useCosmetics();
  const [level, setLevel] = useState<DictionaryLevel>("top10");
  const [method, setMethod] = useState<AttackMethod>("table");
  const [cracked, setCracked] = useState<Record<string, CrackedAccount>>({});
  const [last, setLast] = useState<AttackResult | null>(null);
  const [exhaustive, setExhaustive] = useState(false);
  const [alphabetId, setAlphabetId] = useState<AlphabetId>("all");
  const [length, setLength] = useState(8);
  const [functionId, setFunctionId] = useState<FunctionId>("sha256");
  const [tried, setTried] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);

  const strengthColor: Record<Strength, string> = {
    weak: colors.danger,
    fair: colors.warning,
    strong: theme.accent,
  };

  const found = Object.keys(cracked).length;
  const allFound = found >= lab.weak;
  const asked = lab.question !== undefined && lab.options !== undefined;
  const done = allFound && (!asked || solved);

  const alphabet = ALPHABET[alphabetId];
  const shown = Math.min(length, alphabet.max);
  const guess = GUESS_FUNCTION[functionId];
  const reading = estimate(alphabet, shown, guess);

  const launch = (): void => {
    const result = runAttack(lab.accounts, level, method);
    setLast(result);
    setCracked((before) => {
      const after = { ...before };
      for (const hit of result.cracked) after[hit.user] = hit;
      return after;
    });
    if (level === "variants" && method === "each") setExhaustive(true);
  };

  const choose = (index: number): void => {
    if (solved || tried.includes(index)) return;
    if (index === lab.correct) setSolved(true);
    else setTried([...tried, index]);
  };

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
  const stepStyle = {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 12,
    gap: 8,
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
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text variant="micro" style={{ color: theme.accent }}>
            ATELIER MOTS DE PASSE
          </Text>
          <Text variant="micro" style={{ color: done ? theme.accent : colors.textMuted }}>
            {done ? "Réussi" : `${String(found)} / ${String(lab.weak)} cassés`}
          </Text>
        </View>
        {lab.title !== undefined ? (
          <Text variant="body" style={{ fontFamily: BOLD }}>
            {lab.title}
          </Text>
        ) : null}
      </View>

      <View style={{ padding: 12, gap: 12 }}>
        {lab.task !== undefined ? (
          <Text variant="bodySm" style={{ color: colors.textSecondary }}>
            {lab.task}
          </Text>
        ) : null}
        <Text variant="bodySm" style={{ color: colors.textMuted, lineHeight: 19 }}>
          Tout se passe sur ton téléphone, sur des empreintes d&apos;exemple : rien n&apos;est
          envoyé, et rien ici ne s&apos;attaque à un vrai compte. L&apos;exercice sert à comprendre
          pourquoi un mot de passe tombe, et comment s&apos;en protéger.
        </Text>

        <View style={{ borderWidth: 1, borderColor: colors.borderSubtle }}>
          {lab.accounts.map((account, k) => {
            const hit = cracked[account.user];
            const showNote = account.note !== undefined && (hit !== undefined || exhaustive);
            return (
              <View
                key={account.user}
                accessibilityLabel={`Compte ${account.user}`}
                style={{
                  padding: 10,
                  gap: 3,
                  borderTopWidth: k === 0 ? 0 : 1,
                  borderTopColor: colors.borderSubtle,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <Text style={{ fontFamily: MONO, fontSize: 13, color: colors.textPrimary }}>
                    {account.user}
                  </Text>
                  <Text style={{ fontFamily: MONO, fontSize: 11, color: colors.textMuted }}>
                    {account.salt !== undefined ? `sel : ${account.salt}` : "sans sel"}
                  </Text>
                </View>
                <Text
                  accessibilityLabel={`Empreinte ${account.hash}`}
                  style={{ fontFamily: MONO, fontSize: 11, color: colors.textSecondary }}
                >
                  {shortHash(account.hash)}
                </Text>
                {hit !== undefined ? (
                  <Text style={{ fontFamily: MONO, fontSize: 13, color: colors.danger }}>
                    {hit.password}{" "}
                    <Text style={{ fontFamily: MONO, fontSize: 11, color: colors.textMuted }}>
                      ({groupDigits(hit.tries)} {hit.tries < 2 ? "essai" : "essais"})
                    </Text>
                  </Text>
                ) : last === null ? (
                  <Text variant="bodySm" style={{ color: colors.textMuted }}>
                    pas encore attaqué
                  </Text>
                ) : exhaustive ? (
                  <Text variant="bodySm" style={{ color: theme.accent }}>
                    résiste au dictionnaire
                  </Text>
                ) : (
                  <Text variant="bodySm" style={{ color: colors.textMuted }}>
                    pas trouvé
                  </Text>
                )}
                {showNote ? (
                  <Text variant="bodySm" style={{ color: colors.textMuted }}>
                    {account.note}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={{ gap: 8 }}>
          <Text variant="micro" style={{ color: colors.textMuted }}>
            1 · L&apos;ATTAQUE
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {DICTIONARY_LEVELS.map((candidate) => (
                <Pressable
                  key={candidate}
                  onPress={() => {
                    setLevel(candidate);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: candidate === level }}
                  style={chipStyle(candidate === level)}
                >
                  <Text style={chipText(candidate === level)}>{DICTIONARY_NAMES[candidate]}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Text variant="bodySm" style={{ color: colors.textMuted, lineHeight: 19 }}>
            {DICTIONARY_NOTES[level]} ({groupDigits(candidatesFor(level).length)} mots à essayer.)
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {ATTACK_METHODS.map((candidate) => (
              <Pressable
                key={candidate}
                onPress={() => {
                  setMethod(candidate);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: candidate === method }}
                style={chipStyle(candidate === method)}
              >
                <Text style={chipText(candidate === method)}>{METHOD_NAMES[candidate]}</Text>
              </Pressable>
            ))}
          </View>
          <Text variant="bodySm" style={{ color: colors.textMuted, lineHeight: 19 }}>
            {METHOD_NOTES[method]}
          </Text>
          <Pressable
            onPress={launch}
            accessibilityRole="button"
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: theme.accent,
            }}
          >
            <Text variant="bodySm" style={{ color: theme.accent }}>
              Lancer l&apos;attaque
            </Text>
          </Pressable>
          {last !== null ? (
            <Text variant="bodySm" style={{ color: colors.textPrimary }}>
              {runSummary(last, lab.accounts.length)}
            </Text>
          ) : null}
          {observations(lab.accounts, Object.values(cracked)).map((line) => (
            <Text key={line} variant="bodySm" style={{ color: colors.textSecondary }}>
              {line}
            </Text>
          ))}
          {last !== null && !allFound ? (
            <Text variant="bodySm" style={{ color: colors.textMuted }}>
              Il en reste {String(lab.weak - found)} à trouver. Un dictionnaire plus large, ou une
              autre méthode, en fait tomber d&apos;autres.
            </Text>
          ) : null}
        </View>

        <View style={stepStyle}>
          <Text variant="micro" style={{ color: colors.textMuted }}>
            2 · LA LONGUEUR ET LA LENTEUR
          </Text>
          <Text variant="bodySm" style={{ color: colors.textSecondary }}>
            Un mot de passe qui n&apos;est dans aucun dictionnaire reste attaquable : il suffit de
            tout essayer. Le calculateur donne le nombre de possibilités et le temps pour toutes les
            parcourir, avec la fonction qui garde les empreintes. Ce sont des ordres de grandeur
            pour une carte graphique grand public, pas des mesures.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {GUESS_FUNCTIONS.map((candidate) => (
              <Pressable
                key={candidate.id}
                onPress={() => {
                  setFunctionId(candidate.id);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: candidate.id === functionId }}
                style={chipStyle(candidate.id === functionId)}
              >
                <Text style={chipText(candidate.id === functionId)}>{candidate.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text variant="bodySm" style={{ color: colors.textMuted, lineHeight: 19 }}>
            {guess.note} Environ {guess.rate}.
          </Text>
          {last !== null ? (
            <Text variant="bodySm" style={{ color: colors.textSecondary }}>
              L&apos;attaque que tu viens de lancer ({groupDigits(last.hashes)}{" "}
              {last.hashes < 2 ? "calcul" : "calculs"}) :{" "}
              <Text variant="bodySm" style={{ color: colors.textPrimary, fontFamily: BOLD }}>
                {formatDuration(secondsToTry(last.hashes, guess.perSecond))}
              </Text>
              .
            </Text>
          ) : null}
          {realDictionaryRows(guess).map((row) => (
            <Text key={row.label} variant="bodySm" style={{ color: colors.textSecondary }}>
              {row.label} :{" "}
              <Text variant="bodySm" style={{ color: colors.textPrimary, fontFamily: BOLD }}>
                {row.duration}
              </Text>
              .
            </Text>
          ))}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {ALPHABETS.map((candidate) => (
              <Pressable
                key={candidate.id}
                onPress={() => {
                  setAlphabetId(candidate.id);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: candidate.id === alphabetId }}
                style={chipStyle(candidate.id === alphabetId)}
              >
                <Text style={chipText(candidate.id === alphabetId)}>{candidate.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable
              onPress={() => {
                setLength(Math.max(1, shown - 1));
              }}
              disabled={shown <= 1}
              accessibilityRole="button"
              accessibilityLabel={`Un ${alphabet.unit} de moins`}
              style={{ ...chipStyle(false), opacity: shown <= 1 ? 0.5 : 1 }}
            >
              <Text style={chipText(false)}>−</Text>
            </Pressable>
            <Text style={{ fontFamily: MONO, fontSize: 13, color: colors.textPrimary }}>
              {String(shown)} {shown < 2 ? alphabet.unit : alphabet.unitMany}
            </Text>
            <Pressable
              onPress={() => {
                setLength(Math.min(alphabet.max, shown + 1));
              }}
              disabled={shown >= alphabet.max}
              accessibilityRole="button"
              accessibilityLabel={`Un ${alphabet.unit} de plus`}
              style={{ ...chipStyle(false), opacity: shown >= alphabet.max ? 0.5 : 1 }}
            >
              <Text style={chipText(false)}>+</Text>
            </Pressable>
          </View>
          <View
            style={{
              borderLeftWidth: 2,
              borderLeftColor: strengthColor[reading.strength],
              paddingLeft: 10,
              gap: 3,
            }}
          >
            <Text variant="bodySm" style={{ color: colors.textSecondary }}>
              {reading.combinations} mots de passe possibles. Pour tous les essayer, à {guess.rate}{" "}
              :
            </Text>
            <Text
              style={{ fontFamily: MONO, fontSize: 17, color: strengthColor[reading.strength] }}
            >
              {reading.duration}
            </Text>
            <Text variant="micro" style={{ color: strengthColor[reading.strength] }}>
              {STRENGTH_LABELS[reading.strength]}
            </Text>
          </View>
          <Text variant="bodySm" style={{ color: colors.textMuted, lineHeight: 19 }}>
            Chaque {alphabet.unit} de plus multiplie le travail par {groupDigits(alphabet.size)}.
            C&apos;est pourquoi la longueur compte plus que la bizarrerie, et pourquoi une fonction
            lente change tout : elle multiplie le prix de chaque essai, sans que le mot de passe
            change.
          </Text>
        </View>

        {asked ? (
          <View style={stepStyle}>
            <Text variant="micro" style={{ color: colors.textMuted }}>
              3 · À TOI DE CONCLURE
            </Text>
            <Text variant="bodySm" style={{ color: colors.textPrimary }}>
              {lab.question}
            </Text>
            {(lab.options ?? []).map((option, index) => {
              const wrong = tried.includes(index);
              const right = solved && index === lab.correct;
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    choose(index);
                  }}
                  disabled={solved || wrong}
                  accessibilityRole="button"
                  accessibilityState={{ selected: right, disabled: solved || wrong }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    borderWidth: 1,
                    borderColor: right
                      ? theme.accent
                      : wrong
                        ? colors.danger
                        : colors.borderDefault,
                  }}
                >
                  <Text
                    variant="bodySm"
                    style={{
                      color: right ? theme.accent : wrong ? colors.textMuted : colors.textPrimary,
                      textDecorationLine: wrong ? "line-through" : "none",
                    }}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
            {solved ? (
              <Text variant="bodySm" style={{ color: theme.accent }}>
                Oui.{lab.explanation !== undefined ? ` ${lab.explanation}` : ""}
              </Text>
            ) : tried.length > 0 ? (
              <Text variant="bodySm" style={{ color: colors.danger }}>
                Non, ce n&apos;est pas encore ça. Reprends ce que tu as vu : la liste, le sel, le
                prix de chaque essai.
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={stepStyle}>
          <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.textSecondary }}>
            {allFound ? "✓" : "○"} Comptes faibles retrouvés : {String(Math.min(found, lab.weak))}{" "}
            sur {String(lab.weak)}
          </Text>
          {asked ? (
            <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.textSecondary }}>
              {solved ? "✓" : "○"} Question de synthèse : {solved ? "réussie" : "à répondre"}
            </Text>
          ) : null}
          {done ? (
            <Text style={{ fontFamily: MONO, fontSize: 12, color: theme.accent }}>
              ✓ Atelier réussi : un mot de passe long, un sel par compte et une fonction lente.
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
