import React from "react";
import { Alert, ScrollView, View } from "react-native";
import { router } from "expo-router";
import type { GlossaryTerm } from "@cyberlearn/lib/glossary/terms";
import { colors, fonts } from "@cyberlearn/tokens";
import { FindTheFlawExercise } from "@/components/find-the-flaw";
import { GitSandboxExercise } from "@/components/git-sandbox";
import { CryptoWorkshopExercise } from "@/components/crypto-workshop";
import { FirewallLabExercise } from "@/components/firewall-lab";
import { HexEditorExercise } from "@/components/hex-editor";
import { IncidentStoryExercise } from "@/components/incident-story";
import { JwtLabExercise } from "@/components/jwt-lab";
import { LogHuntExercise } from "@/components/log-hunt";
import { MatchPairsExercise } from "@/components/match-pairs";
import { PacketDissectorExercise } from "@/components/packet-dissector";
import { PasswordLabExercise } from "@/components/password-lab";
import { PhishingEmailExercise } from "@/components/phishing-email";
import { PutInOrderExercise } from "@/components/put-in-order";
import { SubnetDrillExercise } from "@/components/subnet-drill";
import { TerminalCard } from "@/components/terminal-card";
import { Text } from "@/components/ui";
import { useCosmetics, type MobileCosmeticTheme } from "@/lib/cosmetics";
import { glossaryHits } from "@/lib/glossary";
import type { Block } from "@/lib/lesson-blocks";

// ── Glossary words ───────────────────────────────────────────────────────────

/** A glossary word's definition, with the way to the whole glossary. */
function showDefinition(term: GlossaryTerm): void {
  Alert.alert(term.term, term.definition, [
    {
      text: "Tout le glossaire",
      onPress: () => {
        router.push("/glossary");
      },
    },
    { text: "OK", style: "cancel" },
  ]);
}

/**
 * Plain text with the glossary words of `remaining` underlined in dots: a
 * press, short or long, shows the definition (see lib/glossary.ts).
 */
function withGlossary(
  text: string,
  keyBase: string,
  theme: MobileCosmeticTheme,
  remaining: Set<string> | undefined,
): React.ReactNode[] {
  if (remaining === undefined) return [text];
  const out: React.ReactNode[] = [];
  let at = 0;
  for (const hit of glossaryHits(text, remaining)) {
    if (hit.start > at) out.push(text.slice(at, hit.start));
    out.push(
      <Text
        key={`${keyBase}-g${String(hit.start)}`}
        accessibilityRole="button"
        accessibilityHint="Affiche la définition"
        onPress={() => {
          showDefinition(hit.term);
        }}
        onLongPress={() => {
          showDefinition(hit.term);
        }}
        style={{
          textDecorationLine: "underline",
          textDecorationStyle: "dotted",
          textDecorationColor: theme.accent,
        }}
      >
        {hit.text}
      </Text>,
    );
    at = hit.end;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

// ── Inline markdown (bold / italic / inline code) ────────────────────────────

function renderInline(
  text: string,
  keyBase: string,
  theme: MobileCosmeticTheme,
  /** The glossary words this block still has to underline, if any. */
  glossary?: Set<string>,
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Tokenize on **bold**, `code`, *italic* - longest markers first.
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last)
      out.push(
        ...withGlossary(text.slice(last, idx), `${keyBase}-${String(last)}`, theme, glossary),
      );
    const tok = m[0];
    if (tok.startsWith("**")) {
      out.push(
        <Text
          key={`${keyBase}-b${String(k++)}`}
          style={{ fontFamily: `${fonts.sans}_700Bold`, color: colors.textPrimary, fontSize: 14 }}
        >
          {tok.slice(2, -2)}
        </Text>,
      );
    } else if (tok.startsWith("`")) {
      out.push(
        <Text
          key={`${keyBase}-c${String(k++)}`}
          style={{
            fontFamily: `${fonts.mono}_400Regular`,
            fontSize: 12.5,
            color: theme.terminal.foreground,
            backgroundColor: theme.terminal.background,
          }}
        >
          {` ${tok.slice(1, -1)} `}
        </Text>,
      );
    } else {
      out.push(
        <Text
          key={`${keyBase}-i${String(k++)}`}
          style={{ fontStyle: "italic", color: colors.textSecondary, fontSize: 14 }}
        >
          {tok.slice(1, -1)}
        </Text>,
      );
    }
    last = idx + tok.length;
  }
  if (last < text.length) {
    out.push(...withGlossary(text.slice(last), `${keyBase}-${String(last)}`, theme, glossary));
  }
  return out;
}

// ── Callout palette ───────────────────────────────────────────────────────────

const CALLOUT: Record<string, { color: string; label: string }> = {
  info: { color: colors.info, label: "Info" },
  warning: { color: colors.warning, label: "Attention" },
  danger: { color: colors.danger, label: "Danger" },
  success: { color: colors.success, label: "Bonne pratique" },
};

// ── Block renderer ────────────────────────────────────────────────────────────

export function BlockView({
  block,
  index,
  glossary,
}: {
  block: Block;
  index: number;
  /** The glossary words this block is the first of its section to use (glossaryPlan). */
  glossary?: ReadonlySet<string>;
}): React.JSX.Element | null {
  const { theme } = useCosmetics();
  // A copy per render: the pieces of the block take their words out of it in order.
  const remaining = glossary === undefined ? undefined : new Set(glossary);

  switch (block.kind) {
    case "h3":
      return (
        <Text variant="h2" style={{ marginTop: 10 }}>
          {block.text}
        </Text>
      );
    case "paragraph":
      return (
        <Text variant="body" style={{ lineHeight: 22 }}>
          {renderInline(block.text, `p${String(index)}`, theme, remaining)}
        </Text>
      );
    case "list":
      return (
        <View style={{ gap: 6 }}>
          {block.items.map((item, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8 }}>
              <Text style={{ color: theme.accent, fontSize: 13, lineHeight: 22 }}>
                {block.ordered ? `${String(i + 1)}.` : "›"}
              </Text>
              <Text variant="body" style={{ flex: 1, lineHeight: 22 }}>
                {renderInline(item, `l${String(index)}-${String(i)}`, theme, remaining)}
              </Text>
            </View>
          ))}
        </View>
      );
    case "code":
      return (
        <View
          style={{
            backgroundColor: theme.terminal.background,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            overflow: "hidden",
          }}
        >
          {block.lang ? (
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderSubtle,
              }}
            >
              <Text variant="micro" style={{ color: theme.accent }}>
                {block.lang}
              </Text>
            </View>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text
              style={{
                fontFamily: `${fonts.mono}_400Regular`,
                fontSize: 12,
                lineHeight: 19,
                color: theme.terminal.foreground,
                padding: 12,
              }}
            >
              {block.code}
            </Text>
          </ScrollView>
        </View>
      );
    case "callout": {
      const c = CALLOUT[block.type] ?? CALLOUT.info;
      if (!c) return null;
      return (
        <View
          style={{
            borderLeftWidth: 3,
            borderLeftColor: c.color,
            backgroundColor: `${c.color}12`,
            padding: 12,
            gap: 4,
          }}
        >
          <Text variant="micro" style={{ color: c.color }}>
            {c.label}
          </Text>
          <Text variant="body" style={{ lineHeight: 21 }}>
            {renderInline(block.text, `co${String(index)}`, theme, remaining)}
          </Text>
        </View>
      );
    }
    case "playground":
      return (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.accent,
            backgroundColor: theme.terminal.background,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderSubtle,
            }}
          >
            <Text variant="micro" style={{ color: theme.accent }}>
              ▶ Sandbox {block.lang}
            </Text>
            <Text variant="micro" style={{ color: colors.textDisabled }}>
              exécute sur le web
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text
              style={{
                fontFamily: `${fonts.mono}_400Regular`,
                fontSize: 12,
                lineHeight: 19,
                color: theme.terminal.foreground,
                padding: 12,
              }}
            >
              {block.code}
            </Text>
          </ScrollView>
        </View>
      );
    case "flaw":
      return <FindTheFlawExercise flaw={block.flaw} />;
    case "phishing":
      return <PhishingEmailExercise mail={block.mail} />;
    case "git":
      return <GitSandboxExercise sandbox={block.sandbox} />;
    case "subnet":
      return <SubnetDrillExercise drill={block.drill} />;
    case "packet":
      return <PacketDissectorExercise dissector={block.dissector} />;
    case "order":
      return <PutInOrderExercise exercise={block.exercise} />;
    case "match":
      return <MatchPairsExercise exercise={block.exercise} />;
    case "crypto":
      return <CryptoWorkshopExercise workshop={block.workshop} />;
    case "firewall":
      return <FirewallLabExercise lab={block.lab} />;
    case "loghunt":
      return <LogHuntExercise hunt={block.hunt} />;
    case "hex":
      return <HexEditorExercise editor={block.editor} />;
    case "story":
      return <IncidentStoryExercise story={block.story} />;
    case "jwt":
      return <JwtLabExercise lab={block.lab} />;
    case "password":
      return <PasswordLabExercise lab={block.lab} />;
    case "animation":
      return (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.accent,
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
              ANIMATION · PAS À PAS · SUR LE SITE
            </Text>
            <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
              {block.title}
            </Text>
          </View>
          <View style={{ padding: 12, gap: 10 }}>
            {block.steps.map((step, i) => (
              <View key={step.title} style={{ gap: 2 }}>
                <Text variant="bodySm" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
                  {String(i + 1)}. {step.title}
                </Text>
                <Text variant="bodySm">{step.text}</Text>
              </View>
            ))}
            <Text variant="bodySm" style={{ color: colors.textDisabled }}>
              L&apos;animation se joue sur le site, étape par étape : en voici les étapes.
            </Text>
          </View>
        </View>
      );
    case "network":
      return (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.accent,
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
              RÉSEAU · ATELIER · SUR LE SITE
            </Text>
            {block.title !== null ? (
              <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
                {block.title}
              </Text>
            ) : null}
          </View>
          <View style={{ padding: 12, gap: 8 }}>
            {block.task !== null ? <Text variant="bodySm">{block.task}</Text> : null}
            {block.devices.length > 0 ? (
              <Text variant="mono">{block.devices.join(" · ")}</Text>
            ) : null}
            <Text variant="bodySm" style={{ color: colors.textDisabled }}>
              Le schéma, les câbles et le ping se jouent sur le site : c&apos;est là que
              l&apos;exercice se fait.
            </Text>
          </View>
        </View>
      );
    case "osint":
      return (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.accent,
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
              OSINT · PHOTO · SUR LE SITE
            </Text>
            {block.title !== null ? (
              <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
                {block.title}
              </Text>
            ) : null}
          </View>
          <View style={{ padding: 12, gap: 8 }}>
            {block.caption !== null ? (
              <Text variant="bodySm" style={{ color: colors.textSecondary }}>
                Légende qui circule : « {block.caption} »
              </Text>
            ) : null}
            {block.task !== null ? <Text variant="bodySm">{block.task}</Text> : null}
            <Text variant="bodySm" style={{ color: colors.textDisabled }}>
              La photo, ses métadonnées et la carte se lisent sur le site : c&apos;est là que
              l&apos;exercice se joue.
            </Text>
          </View>
        </View>
      );
    case "sql":
      return (
        <View
          style={{
            borderWidth: 1,
            borderColor: block.lab ? colors.danger : theme.accent,
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
            <Text variant="micro" style={{ color: block.lab ? colors.danger : theme.accent }}>
              {block.lab ? "INJECTION SQL · SUR LE SITE" : "SQL · SUR LE SITE"}
            </Text>
            {block.title !== null ? (
              <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
                {block.title}
              </Text>
            ) : null}
          </View>
          <View style={{ padding: 12, gap: 8 }}>
            {block.task !== null ? <Text variant="bodySm">{block.task}</Text> : null}
            {block.query !== null && block.query.trim() !== "" ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Text
                  style={{
                    fontFamily: `${fonts.mono}_400Regular`,
                    fontSize: 12,
                    lineHeight: 19,
                    color: theme.terminal.foreground,
                  }}
                >
                  {block.query}
                </Text>
              </ScrollView>
            ) : null}
            <Text variant="bodySm" style={{ color: colors.textDisabled }}>
              Une vraie base SQLite tourne dans cette leçon, sur le site : c&apos;est là qu&apos;on
              lance les requêtes.
            </Text>
          </View>
        </View>
      );
    case "php":
      return (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.danger,
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
            <Text variant="micro" style={{ color: colors.danger }}>
              SITE VULNÉRABLE · PHP · SUR LE SITE
            </Text>
            {block.title !== null ? (
              <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
                {block.title}
              </Text>
            ) : null}
          </View>
          <View style={{ padding: 12, gap: 8 }}>
            {block.task !== null ? <Text variant="bodySm">{block.task}</Text> : null}
            <Text variant="micro" style={{ color: colors.textSecondary }}>
              {block.file}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text
                style={{
                  fontFamily: `${fonts.mono}_400Regular`,
                  fontSize: 12,
                  lineHeight: 19,
                  color: theme.terminal.foreground,
                }}
              >
                {block.code}
              </Text>
            </ScrollView>
            <Text variant="bodySm" style={{ color: colors.textDisabled }}>
              Un vrai PHP tourne dans le navigateur, sur le site : c&apos;est là qu&apos;on attaque
              la page, puis qu&apos;on corrige son code.
            </Text>
          </View>
        </View>
      );
    case "challenge":
      return (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.accent,
            backgroundColor: colors.bgElevated,
            overflow: "hidden",
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
              ◆ Défi Python
            </Text>
            <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
              {block.title}
            </Text>
          </View>
          <View style={{ padding: 12, gap: 10 }}>
            {block.description !== null ? (
              <Text variant="bodySm" style={{ lineHeight: 20 }}>
                {block.description}
              </Text>
            ) : null}
            {block.code !== "" ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ backgroundColor: theme.terminal.background }}
              >
                <Text
                  style={{
                    fontFamily: `${fonts.mono}_400Regular`,
                    fontSize: 12,
                    lineHeight: 19,
                    color: theme.terminal.foreground,
                    padding: 12,
                  }}
                >
                  {block.code}
                </Text>
              </ScrollView>
            ) : null}
            {block.tests.length > 0 ? (
              <View style={{ gap: 4 }}>
                <Text variant="micro" style={{ color: colors.textMuted }}>
                  Tests à faire passer
                </Text>
                {block.tests.map((t, i) => (
                  <Text
                    key={i}
                    style={{
                      fontFamily: `${fonts.mono}_400Regular`,
                      fontSize: 12,
                      color: colors.textSecondary,
                    }}
                  >
                    {t.label !== null ? `${t.label} : ` : ""}
                    {t.input} → {t.expected}
                  </Text>
                ))}
              </View>
            ) : null}
            <Text variant="bodySm" style={{ color: colors.textDisabled }}>
              Les tests se lancent sur le site.
            </Text>
          </View>
        </View>
      );
    case "terminal":
      return <TerminalCard block={block} />;
    case "placeholder":
      return (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.borderDefault,
            borderStyle: "dashed",
            padding: 16,
            alignItems: "center",
            gap: 4,
          }}
        >
          <Text variant="micro" style={{ color: colors.textMuted }}>
            {block.label}
          </Text>
          <Text variant="bodySm" style={{ textAlign: "center" }}>
            Exercice interactif · disponible sur cyberlearn.fr
          </Text>
        </View>
      );
    case "quiz":
      // Quizzes are collected and played at the end of the lesson, not inline.
      return null;
  }
}
