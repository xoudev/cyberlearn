import React from "react";
import { Alert, ScrollView, View } from "react-native";
import { router } from "expo-router";
import type { GlossaryTerm } from "@cyberlearn/lib/glossary/terms";
import { colors, fonts } from "@cyberlearn/tokens";
import { FindTheFlawExercise } from "@/components/find-the-flaw";
import { GitSandboxExercise } from "@/components/git-sandbox";
import { PhishingEmailExercise } from "@/components/phishing-email";
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
      return (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.borderDefault,
            backgroundColor: theme.terminal.background,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderSubtle,
            }}
          >
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }}
            />
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning }}
            />
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }}
            />
            <Text variant="micro" style={{ marginLeft: 6, color: colors.textMuted }}>
              {block.title ?? "Terminal"}
            </Text>
          </View>
          <View style={{ padding: 12, gap: 6 }}>
            {block.timeLimitMinutes !== undefined ? (
              <Text variant="bodySm" style={{ color: colors.warning }}>
                Épreuve chronométrée : {block.timeLimitMinutes} minute
                {block.timeLimitMinutes > 1 ? "s" : ""}, à passer dans le vrai terminal, sur le
                site.
              </Text>
            ) : null}
            {block.commands.length > 0 ? (
              <>
                <Text variant="micro" style={{ color: colors.textMuted }}>
                  Commandes à essayer
                </Text>
                {block.commands.map((c, i) => (
                  <Text
                    key={i}
                    style={{
                      fontFamily: `${fonts.mono}_500Medium`,
                      fontSize: 12.5,
                      color: theme.terminal.foreground,
                    }}
                  >
                    $ {c}
                  </Text>
                ))}
              </>
            ) : (
              <Text
                style={{
                  fontFamily: `${fonts.mono}_400Regular`,
                  fontSize: 12.5,
                  color: theme.terminal.foreground,
                }}
              >
                $ _ terminal interactif (sur le web)
              </Text>
            )}
            {block.hints.length > 0 ? (
              <View style={{ marginTop: 4, gap: 3 }}>
                {block.hints.map((h, i) => (
                  <Text key={i} variant="bodySm" style={{ color: colors.textMuted }}>
                    › {h}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      );
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
