import React from "react";
import { ScrollView, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics, type MobileCosmeticTheme } from "@/lib/cosmetics";
import type { Block } from "@/lib/lesson-blocks";

// ── Inline markdown (bold / italic / inline code) ────────────────────────────

function renderInline(
  text: string,
  keyBase: string,
  theme: MobileCosmeticTheme,
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Tokenize on **bold**, `code`, *italic* - longest markers first.
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
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
  if (last < text.length) out.push(text.slice(last));
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
}: { block: Block; index: number }): React.JSX.Element | null {
  const { theme } = useCosmetics();

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
          {renderInline(block.text, `p${String(index)}`, theme)}
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
                {renderInline(item, `l${String(index)}-${String(i)}`, theme)}
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
            {renderInline(block.text, `co${String(index)}`, theme)}
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
