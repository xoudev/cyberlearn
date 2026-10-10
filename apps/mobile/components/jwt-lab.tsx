import React, { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { guessSecret, splitToken } from "@cyberlearn/lib/crypto/jwt";
import {
  type CodeLine,
  type Draft,
  draftToken,
  isAttackLevel,
  isForgery,
  isLifetimeAnswer,
  jsonProblem,
  LEVEL_SERVICES,
  LEVEL_TEXTS,
  publicKeyFacts,
  publicKeyPem,
  receivedToken,
  type Replay,
  replay,
  replayHolds,
  replaysFor,
  SANDBOX_CLOCK,
  SERVICE_CODE,
  SERVICE_NAMES,
  type ServiceId,
  type SignatureKind,
  startDraft,
  type Verdict,
  verifyAt,
  viewToken,
  WORDLIST,
} from "@cyberlearn/lib/crypto/jwt-lab";
import type { JwtLab, JwtLevel } from "@cyberlearn/types";
import { category, colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * The site's <JwtLab>, played in the app: the same services, flawed then
 * corrected, the same tokens and the same words (@cyberlearn/lib/crypto/jwt-lab).
 * The signatures are checked by the shared code, written without WebCrypto,
 * which the app's JavaScript engine does not have.
 */

const MONO = `${fonts.mono}_400Regular`;
const BOLD = `${fonts.sans}_700Bold`;

const inSentence = (name: string): string => name.charAt(0).toLowerCase() + name.slice(1);

const SIGNATURE_CHOICES: readonly { kind: SignatureKind; text: string }[] = [
  { kind: "keep", text: "Garder la signature d'origine" },
  { kind: "none", text: "Aucune signature" },
  { kind: "hmac", text: "HMAC-SHA256 avec ce secret" },
];

interface Sent {
  readonly token: string;
  readonly verdict: Verdict;
}

export function JwtLabExercise({ lab }: { lab: JwtLab }): React.JSX.Element {
  const { theme } = useCosmetics();
  const [chosen, setChosen] = useState<JwtLevel | null>(null);
  const [done, setDone] = useState<Partial<Record<JwtLevel, true>>>({});
  const [forged, setForged] = useState<Partial<Record<ServiceId, string>>>({});
  const [drafts, setDrafts] = useState<Partial<Record<ServiceId, Draft>>>({});
  const [sent, setSent] = useState<Partial<Record<ServiceId, Sent>>>({});

  const level = chosen ?? lab.levels[0] ?? "decode";
  const text = LEVEL_TEXTS[level];
  const finish = (finished: JwtLevel): void => {
    setDone((before) => ({ ...before, [finished]: true }));
  };
  const doneCount = lab.levels.filter((l) => done[l] === true).length;

  const chip = (active: boolean) => ({
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
            ATELIER JWT
          </Text>
          <Text variant="micro">
            {String(doneCount)} / {String(lab.levels.length)} étapes
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
        <Text variant="bodySm">
          Bac à sable : des clés, des secrets et des jetons d&apos;exemple de la plateforme, une
          horloge fixée au {SANDBOX_CLOCK}. Rien ne part de ton téléphone, et rien de tout cela ne
          protège quoi que ce soit.
        </Text>

        {lab.levels.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {lab.levels.map((candidate) => (
                <Pressable
                  key={candidate}
                  onPress={() => {
                    setChosen(candidate);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: candidate === level }}
                  style={chip(candidate === level)}
                >
                  <Text style={chipText(candidate === level)}>
                    {LEVEL_TEXTS[candidate].name}
                    {done[candidate] === true ? " ✓" : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : null}

        <View style={{ gap: 8 }}>
          <Text variant="h3">{text.title}</Text>
          {text.intro.map((paragraph) => (
            <Text key={paragraph} variant="bodySm" style={{ color: colors.textSecondary }}>
              {paragraph}
            </Text>
          ))}
          <Text variant="bodySm" style={{ color: colors.textPrimary }}>
            <Text variant="micro" style={{ color: theme.accent }}>
              OBJECTIF{" "}
            </Text>
            {text.goal}
          </Text>
        </View>

        {level === "decode" ? (
          <DecodeStep
            solved={done.decode === true}
            hint={text.hint}
            onSolved={() => {
              finish("decode");
            }}
          />
        ) : level === "fixed" ? (
          <FixedStep
            levels={lab.levels}
            forged={forged}
            onDone={() => {
              finish("fixed");
            }}
          />
        ) : isAttackLevel(level) ? (
          <ForgeStep
            level={level}
            hint={text.hint}
            forged={forged}
            drafts={drafts}
            sent={sent}
            onDraft={(service, draft) => {
              setDrafts((before) => ({ ...before, [service]: draft }));
            }}
            onSent={(service, attempt) => {
              setSent((before) => ({ ...before, [service]: attempt }));
            }}
            onForged={(service, token) => {
              setForged((before) => ({ ...before, [service]: token }));
              finish(level);
            }}
          />
        ) : null}

        {done[level] === true ? (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.borderSubtle,
              paddingTop: 10,
              gap: 8,
            }}
          >
            <Text variant="micro" style={{ color: theme.accent }}>
              POURQUOI
            </Text>
            {text.why.map((paragraph) => (
              <Text key={paragraph} variant="bodySm" style={{ color: colors.textSecondary }}>
                {paragraph}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────────

function fieldStyle() {
  return {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    color: colors.textPrimary,
    fontFamily: MONO,
    fontSize: 13,
  } as const;
}

function Button({
  label,
  onPress,
  disabled,
  primary,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  accessibilityLabel?: string;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled === true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: primary === true ? theme.accent : colors.borderDefault,
        opacity: disabled === true ? 0.5 : 1,
      }}
    >
      <Text
        variant="micro"
        style={{ color: primary === true ? theme.accent : colors.textSecondary }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Collapsible({
  title,
  open,
  children,
}: {
  title: string;
  open?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const [shown, setShown] = useState(open === true);
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={() => {
          setShown((was) => !was);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: shown }}
      >
        <Text variant="micro">
          {shown ? "▾" : "▸"} {title}
        </Text>
      </Pressable>
      {shown ? children : null}
    </View>
  );
}

function TokenText({ token }: { token: string }): React.JSX.Element {
  const { theme } = useCosmetics();
  const style = fieldStyle();
  const parts = splitToken(token);
  return (
    <Text selectable style={style}>
      {parts === null ? (
        token
      ) : (
        <>
          <Text style={{ color: theme.accent, fontFamily: MONO, fontSize: 13 }}>
            {parts.header}
          </Text>
          .
          <Text style={{ color: colors.warning, fontFamily: MONO, fontSize: 13 }}>
            {parts.payload}
          </Text>
          .
          <Text style={{ color: category.DEV, fontFamily: MONO, fontSize: 13 }}>
            {parts.signature}
          </Text>
        </>
      )}
    </Text>
  );
}

function Legend(): React.JSX.Element {
  const { theme } = useCosmetics();
  const swatches = [
    ["En-tête", theme.accent],
    ["Charge utile", colors.warning],
    ["Signature", category.DEV],
  ] as const;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {swatches.map(([name, color]) => (
        <Text key={name} variant="micro" style={{ color }}>
          ■ {name}
        </Text>
      ))}
    </View>
  );
}

function CodeBlock({ lines }: { lines: readonly CodeLine[] }): React.JSX.Element {
  const { theme } = useCosmetics();
  return (
    <ScrollView
      horizontal
      style={{ borderWidth: 1, borderColor: colors.borderDefault }}
      contentContainerStyle={{ paddingVertical: 6 }}
    >
      <View>
        {lines.map((line, i) => (
          <View
            // A fixed listing, never reordered: the index is its identity.
            key={`${String(i)}-${line.text}`}
            style={{
              paddingHorizontal: 8,
              backgroundColor:
                line.mark === "flaw"
                  ? "rgba(255,176,32,0.2)"
                  : line.mark === "fix"
                    ? "rgba(10,255,212,0.16)"
                    : "transparent",
            }}
          >
            <Text
              style={{
                fontFamily: MONO,
                fontSize: 12,
                color: line.mark === undefined ? colors.textSecondary : theme.accent,
              }}
            >
              {line.mark === "flaw" ? "! " : line.mark === "fix" ? "+ " : "  "}
              {line.text === "" ? " " : line.text}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function VerdictView({ verdict }: { verdict: Verdict }): React.JSX.Element {
  const { theme } = useCosmetics();
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontFamily: MONO,
          fontSize: 12,
          color: verdict.accepted ? theme.accent : colors.danger,
        }}
      >
        {verdict.accepted ? "✓ Jeton accepté" : "✗ Jeton refusé"}
      </Text>
      {verdict.steps.map((step) => (
        <Text
          key={step.text}
          variant="bodySm"
          style={{
            color:
              step.tone === "bad"
                ? colors.danger
                : step.tone === "ok"
                  ? theme.accent
                  : colors.textSecondary,
          }}
        >
          {"•"} {step.text}
        </Text>
      ))}
    </View>
  );
}

// ── step 1: reading a token ──────────────────────────────────────────────────

function DecodeStep({
  solved,
  hint,
  onSolved,
}: {
  solved: boolean;
  hint: string;
  onSolved: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const style = fieldStyle();
  const token = receivedToken("trusting");
  const view = viewToken(token);
  const [shown, setShown] = useState<readonly boolean[]>([false, false, false]);
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState(0);
  const names = ["l'en-tête", "la charge utile", "la signature"] as const;
  const colorsOfParts = [theme.accent, colors.warning, category.DEV] as const;

  const propose = (): void => {
    if (solved || answer.trim() === "") return;
    if (isLifetimeAnswer(answer)) onSolved();
    else setAttempts((n) => n + 1);
  };

  return (
    <View style={{ gap: 10 }}>
      <Text variant="micro">LE JETON D&apos;ALICE</Text>
      <TokenText token={token} />
      <Legend />
      {view?.map((part, i) => (
        <View key={part.label} style={{ gap: 6 }}>
          <Button
            label={`Décoder ${names[i] ?? ""}`}
            onPress={() => {
              setShown((before) => before.map((was, k) => (k === i ? !was : was)));
            }}
          />
          {shown[i] === true ? (
            <Text selectable style={{ ...style, color: colorsOfParts[i] ?? colors.textPrimary }}>
              {part.decoded}
            </Text>
          ) : null}
        </View>
      ))}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={answer}
          onChangeText={setAnswer}
          onSubmitEditing={propose}
          editable={!solved}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          accessibilityLabel="Durée de validité du jeton"
          placeholder="Une durée, avec son unité"
          placeholderTextColor={colors.textDisabled}
          style={{ ...style, flex: 1 }}
        />
        <Button
          label="Vérifier"
          onPress={propose}
          disabled={solved || answer.trim() === ""}
          primary
        />
      </View>
      {solved ? (
        <Text style={{ fontFamily: MONO, fontSize: 12, color: theme.accent }}>
          ✓ Une heure : exp moins iat fait 3600 secondes.
        </Text>
      ) : attempts > 0 ? (
        <Text variant="bodySm" style={{ color: colors.danger }}>
          Non, ce n&apos;est pas encore ça.
          <Text variant="bodySm" style={{ color: colors.textSecondary }}>
            {" "}
            Indice : {hint}
          </Text>
        </Text>
      ) : null}
    </View>
  );
}

// ── steps 2 to 4: forging ────────────────────────────────────────────────────

interface ForgeProps {
  level: "none" | "weak-secret" | "confusion";
  hint: string;
  forged: Partial<Record<ServiceId, string>>;
  drafts: Partial<Record<ServiceId, Draft>>;
  sent: Partial<Record<ServiceId, Sent>>;
  onDraft: (service: ServiceId, draft: Draft) => void;
  onSent: (service: ServiceId, attempt: Sent) => void;
  onForged: (service: ServiceId, token: string) => void;
}

function ForgeStep(props: ForgeProps): React.JSX.Element {
  const { level, hint, forged, drafts, sent, onDraft, onSent, onForged } = props;
  const { theme } = useCosmetics();
  const style = fieldStyle();
  const services: readonly ServiceId[] = LEVEL_SERVICES[level];
  const [picked, setPicked] = useState<ServiceId | null>(null);
  const service = picked ?? services[0] ?? "trusting";
  const draft = drafts[service] ?? startDraft(service);
  const token = draftToken(service, draft);
  const attempt = sent[service];
  const name = SERVICE_NAMES[service];
  const asymmetric = service === "rsa" || service === "ec";
  const edit = (change: Partial<Draft>): void => {
    onDraft(service, { ...draft, ...change });
  };

  const send = (): void => {
    const verdict = verifyAt(service, "vulnerable", token);
    onSent(service, { token, verdict });
    if (isForgery(verdict)) onForged(service, token);
  };

  const headerProblem = jsonProblem(draft.header);
  const payloadProblem = jsonProblem(draft.payload);
  const input = { ...style, textAlignVertical: "top" } as const;

  return (
    <View style={{ gap: 12 }}>
      {services.length > 1 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {services.map((candidate) => (
            <Pressable
              key={candidate}
              onPress={() => {
                setPicked(candidate);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: candidate === service }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: candidate === service ? theme.accent : colors.borderDefault,
                backgroundColor: candidate === service ? theme.accent : "transparent",
              }}
            >
              <Text
                style={{
                  fontFamily: MONO,
                  fontSize: 12,
                  color: candidate === service ? colors.bgBase : colors.textSecondary,
                }}
              >
                {SERVICE_NAMES[candidate]}
                {forged[candidate] !== undefined ? " ✓" : ""}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <Text variant="micro">
          LE JETON QUE {name.toUpperCase()} T&apos;A REMIS (alice, rôle user)
        </Text>
        <TokenText token={receivedToken(service)} />
        <Legend />
      </View>

      <Collapsible title={`Le code du ${inSentence(name)}`} open>
        <CodeBlock lines={SERVICE_CODE[service].vulnerable} />
      </Collapsible>

      {service === "weak" ? (
        <Dictionary
          onFound={(word) => {
            edit({ signature: "hmac", secret: word });
          }}
        />
      ) : null}

      {asymmetric ? (
        <Collapsible title={publicKeyFacts(service).title} open>
          {publicKeyFacts(service).lines.map((line) => (
            <Text key={line} variant="bodySm" style={{ color: colors.textSecondary }}>
              {"•"} {line}
            </Text>
          ))}
          <Text selectable accessibilityLabel="Clé publique du service (PEM)" style={style}>
            {publicKeyPem(service)}
          </Text>
        </Collapsible>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text variant="micro">TON JETON</Text>
        <Text variant="micro">En-tête (JSON)</Text>
        <TextInput
          value={draft.header}
          onChangeText={(text) => {
            edit({ header: text });
          }}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          accessibilityLabel="En-tête (JSON)"
          style={{ ...input, minHeight: 44 }}
        />
        {headerProblem !== null ? (
          <Text variant="bodySm" style={{ color: colors.danger }}>
            {headerProblem}
          </Text>
        ) : null}
        <Text variant="micro">Charge utile (JSON)</Text>
        <TextInput
          value={draft.payload}
          onChangeText={(text) => {
            edit({ payload: text });
          }}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          accessibilityLabel="Charge utile (JSON)"
          style={{ ...input, minHeight: 88 }}
        />
        {payloadProblem !== null ? (
          <Text variant="bodySm" style={{ color: colors.danger }}>
            {payloadProblem}
          </Text>
        ) : null}

        <Text variant="micro">Signature</Text>
        {SIGNATURE_CHOICES.map((choice) => {
          const on = draft.signature === choice.kind;
          return (
            <Pressable
              key={choice.kind}
              onPress={() => {
                edit({ signature: choice.kind });
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: on ? theme.accent : colors.borderDefault,
                  backgroundColor: on ? theme.accent : "transparent",
                }}
              />
              <Text variant="bodySm" style={{ color: colors.textSecondary }}>
                {choice.text}
              </Text>
            </Pressable>
          );
        })}
        <TextInput
          value={draft.secret}
          onChangeText={(text) => {
            edit({ secret: text });
          }}
          editable={draft.signature === "hmac"}
          multiline={asymmetric}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          accessibilityLabel="Secret HMAC"
          placeholder="Le secret, tel quel"
          placeholderTextColor={colors.textDisabled}
          style={{
            ...input,
            minHeight: asymmetric ? 72 : undefined,
            opacity: draft.signature === "hmac" ? 1 : 0.5,
          }}
        />
        {asymmetric ? (
          <Button
            label="Prendre la clé publique du service comme secret"
            onPress={() => {
              edit({ signature: "hmac", secret: publicKeyPem(service) });
            }}
          />
        ) : null}

        <Text variant="micro">Ton jeton forgé</Text>
        <TokenText token={token} />
        <Button label={`Envoyer au ${inSentence(name)}`} onPress={send} primary />
      </View>

      {attempt !== undefined ? (
        <View style={{ gap: 8 }}>
          <VerdictView verdict={attempt.verdict} />
          {isForgery(attempt.verdict) ? (
            <Text style={{ fontFamily: MONO, fontSize: 12, color: theme.accent }}>
              ✓ Forgé : le {inSentence(name)} te prend pour un administrateur.
            </Text>
          ) : (
            <Text variant="bodySm" style={{ color: colors.textSecondary }}>
              <Text variant="bodySm" style={{ color: colors.danger }}>
                Pas encore.
              </Text>{" "}
              Indice : {hint}
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function Dictionary({ onFound }: { onFound: (word: string) => void }): React.JSX.Element {
  const { theme } = useCosmetics();
  const style = fieldStyle();
  const token = receivedToken("weak");
  const [run, setRun] = useState<{ found: string | null; tried: number } | null>(null);
  const [word, setWord] = useState("");
  const tested = word === "" ? null : guessSecret(token, [word]).found;
  return (
    <View style={{ gap: 8 }}>
      <Collapsible title={`Le dictionnaire (${String(WORDLIST.length)} mots)`}>
        <Text variant="bodySm" style={{ fontFamily: MONO }}>
          {WORDLIST.join(" · ")}
        </Text>
      </Collapsible>
      <Button
        label="Lancer le dictionnaire"
        onPress={() => {
          setRun(guessSecret(token, WORDLIST));
        }}
        primary
      />
      <TextInput
        value={word}
        onChangeText={setWord}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        accessibilityLabel="Mot à essayer comme secret"
        placeholder="Ou un mot de ton choix"
        placeholderTextColor={colors.textDisabled}
        style={style}
      />
      {run !== null ? (
        run.found !== null ? (
          <>
            <Text style={{ fontFamily: MONO, fontSize: 12, color: theme.accent }}>
              ✓ Secret trouvé : « {run.found} » à l&apos;essai {String(run.tried)} sur{" "}
              {String(WORDLIST.length)}. Chaque essai est un HMAC du jeton, comparé à sa signature.
            </Text>
            <Button
              label={`Signer avec « ${run.found} »`}
              onPress={() => {
                onFound(run.found ?? "");
              }}
            />
          </>
        ) : (
          <Text variant="bodySm" style={{ color: colors.danger }}>
            Aucun des {String(run.tried)} mots ne redonne la signature.
          </Text>
        )
      ) : null}
      {tested !== null ? (
        <Text style={{ fontFamily: MONO, fontSize: 12, color: theme.accent }}>
          ✓ « {word} » redonne la signature du jeton : c&apos;est le secret.
        </Text>
      ) : word !== "" ? (
        <Text variant="bodySm">« {word} » ne redonne pas la signature du jeton.</Text>
      ) : null}
    </View>
  );
}

// ── step 5: the corrected services ───────────────────────────────────────────

interface Played {
  readonly token: string;
  readonly verdict: Verdict;
}

function FixedStep({
  levels,
  forged,
  onDone,
}: {
  levels: readonly JwtLevel[];
  forged: Partial<Record<ServiceId, string>>;
  onDone: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const replays = replaysFor(levels, forged);
  const [played, setPlayed] = useState<Partial<Record<string, Played>>>({});
  const services = [...new Set(replays.map((entry) => entry.service))];

  const holds = (entry: Replay, table: Partial<Record<string, Played>>): boolean => {
    const result = table[entry.key];
    return result?.token === entry.token && replayHolds(entry, result.verdict);
  };

  const play = (entry: Replay): void => {
    const next = { ...played, [entry.key]: { token: entry.token, verdict: replay(entry) } };
    setPlayed(next);
    if (replays.every((candidate) => holds(candidate, next))) onDone();
  };

  return (
    <View style={{ gap: 12 }}>
      {replays.map((entry) => {
        const result = played[entry.key];
        const current = result?.token === entry.token ? result : undefined;
        const ok = current !== undefined && replayHolds(entry, current.verdict);
        return (
          <View
            key={entry.key}
            style={{ borderWidth: 1, borderColor: colors.borderSubtle, padding: 10, gap: 8 }}
          >
            <Text variant="h3">{entry.label}</Text>
            <Text variant="micro">
              {entry.legit ? "jeton légitime" : entry.own ? "ton jeton" : "attaque type"}
            </Text>
            <Collapsible title="Le jeton envoyé">
              <TokenText token={entry.token} />
            </Collapsible>
            <Button
              label={entry.legit ? "Envoyer" : "Rejouer"}
              accessibilityLabel={`${entry.legit ? "Envoyer" : "Rejouer"} : ${entry.label}`}
              onPress={() => {
                play(entry);
              }}
              primary
            />
            {current !== undefined ? (
              <View style={{ gap: 6 }}>
                <VerdictView verdict={current.verdict} />
                <Text
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    color: ok ? theme.accent : colors.danger,
                  }}
                >
                  {ok
                    ? entry.legit
                      ? "✓ Accepté, comme il faut : la correction ne casse rien."
                      : "✓ Refusé, comme il faut."
                    : entry.legit
                      ? "Inattendu : le jeton légitime est refusé."
                      : "Inattendu : l'attaque passe encore."}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
      {services.map((service) => (
        <Collapsible
          key={service}
          title={`Le code corrigé du ${inSentence(SERVICE_NAMES[service])}`}
        >
          <CodeBlock lines={SERVICE_CODE[service].patched} />
        </Collapsible>
      ))}
    </View>
  );
}
