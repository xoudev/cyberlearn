import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Linking, ScrollView, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import {
  parseNoteMarkdown,
  type NoteInline,
  type NoteLines,
} from "@cyberlearn/lib/markdown/note-markdown";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * A forum post or a note, drawn natively. The parsing is the site's
 * (@cyberlearn/lib/markdown/note-markdown), so a message reads the same on
 * both; everything in the tree is text, drawn as text. A link is only ever
 * http(s) or mailto (the parser leaves any other scheme as plain text).
 */
export function NoteMarkdown({
  markdown,
  dimmed = false,
}: {
  markdown: string;
  /** A post taken down, shown to its author only. */
  dimmed?: boolean;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const blocks = parseNoteMarkdown(markdown);

  const open = (href: string): void => {
    if (href.toLowerCase().startsWith("mailto:")) void Linking.openURL(href);
    else void WebBrowser.openBrowserAsync(href);
  };

  const inline = (nodes: readonly NoteInline[], key: string): React.ReactNode[] =>
    nodes.map((node, i) => {
      const k = `${key}-${String(i)}`;
      switch (node.kind) {
        case "text":
          return node.text;
        case "code":
          return (
            <Text
              key={k}
              style={{
                fontFamily: `${fonts.mono}_400Regular`,
                fontSize: 12.5,
                color: colors.textPrimary,
                backgroundColor: colors.bgBase,
              }}
            >
              {` ${node.text} `}
            </Text>
          );
        case "strong":
          return (
            <Text
              key={k}
              style={{ fontFamily: `${fonts.sans}_700Bold`, color: colors.textPrimary }}
            >
              {inline(node.children, k)}
            </Text>
          );
        case "em":
          return (
            <Text key={k} style={{ fontStyle: "italic" }}>
              {inline(node.children, k)}
            </Text>
          );
        case "link":
          return (
            <Text
              key={k}
              accessibilityRole="link"
              onPress={() => {
                open(node.href);
              }}
              style={{ color: theme.accent, textDecorationLine: "underline" }}
            >
              {inline(node.children, k)}
            </Text>
          );
      }
    });

  const lines = (value: NoteLines, key: string): React.ReactNode[] =>
    value.flatMap((line, i) =>
      i === 0
        ? inline(line, `${key}-${String(i)}`)
        : ["\n", ...inline(line, `${key}-${String(i)}`)],
    );

  return (
    <View style={{ gap: 10, opacity: dimmed ? 0.55 : 1 }}>
      {blocks.map((block, i) => {
        const key = `b${String(i)}`;
        switch (block.kind) {
          case "paragraph":
            return (
              <Text key={key} variant="body" style={{ color: colors.textSecondary }}>
                {lines(block.lines, key)}
              </Text>
            );
          case "heading":
            return (
              <Text key={key} variant={block.level <= 2 ? "h2" : "h3"}>
                {inline(block.children, key)}
              </Text>
            );
          case "quote":
            return (
              <View
                key={key}
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: colors.borderDefault,
                  paddingLeft: 10,
                }}
              >
                <Text variant="body" style={{ color: colors.textMuted }}>
                  {lines(block.lines, key)}
                </Text>
              </View>
            );
          case "list":
            return (
              <View key={key} style={{ gap: 4 }}>
                {block.items.map((item, n) => (
                  <View key={`${key}-${String(n)}`} style={{ flexDirection: "row", gap: 8 }}>
                    <Text
                      variant="mono"
                      style={{ color: theme.accent, minWidth: block.ordered ? 18 : 10 }}
                    >
                      {block.ordered ? `${String(n + 1)}.` : "•"}
                    </Text>
                    <Text variant="body" style={{ flex: 1, color: colors.textSecondary }}>
                      {inline(item, `${key}-${String(n)}`)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          case "code":
            return (
              <ScrollView
                key={key}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{
                  backgroundColor: colors.bgBase,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                }}
                contentContainerStyle={{ padding: 12 }}
              >
                <Text
                  selectable
                  style={{
                    fontFamily: `${fonts.mono}_400Regular`,
                    fontSize: 12.5,
                    lineHeight: 18,
                    color: colors.textPrimary,
                  }}
                >
                  {block.text}
                </Text>
              </ScrollView>
            );
          case "hr":
            return <View key={key} style={{ height: 1, backgroundColor: colors.borderSubtle }} />;
        }
      })}
    </View>
  );
}
