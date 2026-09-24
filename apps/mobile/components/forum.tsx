import { useRouter } from "expo-router";
import React from "react";
import { TextInput, type TextInputProps, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { HELD_FOR_REVIEW } from "@cyberlearn/lib/moderation/notice";
import { PressableScale } from "@/components/anim";
import { ActionChip } from "@/components/buttons";
import { Card, Text } from "@/components/ui";
import { forumDate, replyCountLabel, type ForumTopicSummary } from "@/lib/forum";

/** The forum's shared pieces, so its four screens cannot drift apart. */

/** "Épinglé" / "Fermé", as the site tags a thread. */
export function ForumTag({ kind }: { kind: "pinned" | "locked" }): React.JSX.Element {
  const color = kind === "pinned" ? colors.warning : colors.textMuted;
  return (
    <View style={{ borderWidth: 1, borderColor: color, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text variant="micro" style={{ color, fontSize: 9 }}>
        {kind === "pinned" ? "Épinglé" : "Fermé"}
      </Text>
    </View>
  );
}

/** One thread in a list: its title, the start of its question, how busy it is. */
export function TopicRow({
  topic,
  showCategory = true,
}: {
  topic: ForumTopicSummary;
  /** Off inside a section, where naming it on every row says nothing. */
  showCategory?: boolean;
}): React.JSX.Element {
  const router = useRouter();
  return (
    <PressableScale
      accessibilityLabel={`${topic.title}, ${replyCountLabel(topic.replyCount)}`}
      onPress={() => {
        router.push({
          pathname: "/forum/[category]/[topic]",
          params: { category: topic.categorySlug, topic: topic.slug },
        });
      }}
    >
      <Card accent={topic.categoryAccent} style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          {topic.pinned || topic.locked ? (
            <View style={{ flexDirection: "row", gap: 6 }}>
              {topic.pinned ? <ForumTag kind="pinned" /> : null}
              {topic.locked ? <ForumTag kind="locked" /> : null}
            </View>
          ) : null}
          <Text variant="h3" numberOfLines={2}>
            {topic.title}
          </Text>
          {topic.preview !== "" ? (
            <Text variant="bodySm" numberOfLines={2}>
              {topic.preview}
            </Text>
          ) : null}
          <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
            {showCategory ? `${topic.categoryName} · ` : ""}
            {topic.author?.name ?? "Compte supprimé"} · {forumDate(topic.lastPostAt)}
          </Text>
        </View>
        <View style={{ alignItems: "center", minWidth: 44 }}>
          <Text
            style={{
              fontFamily: `${fonts.sans}_800ExtraBold`,
              fontSize: 18,
              color: colors.textPrimary,
            }}
          >
            {topic.replyCount}
          </Text>
          <Text variant="micro" style={{ fontSize: 8.5 }}>
            {topic.replyCount > 1 ? "réponses" : "réponse"}
          </Text>
        </View>
      </Card>
    </PressableScale>
  );
}

/** The screen's decision, said plainly: written, but only its author sees it. */
export function HeldNotice(): React.JSX.Element {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: colors.warning,
        backgroundColor: "rgba(255,176,32,0.07)",
        padding: 12,
      }}
    >
      <Text variant="bodySm" style={{ color: colors.textSecondary }}>
        {HELD_FOR_REVIEW}
      </Text>
    </View>
  );
}

/** A multi-line field for a message, styled like the rest of the app. */
export function MessageInput(props: TextInputProps & { minHeight?: number }): React.JSX.Element {
  const { minHeight = 120, style, ...rest } = props;
  return (
    <TextInput
      multiline
      placeholderTextColor={colors.textDisabled}
      textAlignVertical="top"
      {...rest}
      style={[
        {
          minHeight,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.borderDefault,
          backgroundColor: colors.bgBase,
          color: colors.textPrimary,
          fontFamily: `${fonts.sans}_400Regular`,
          fontSize: 14,
          lineHeight: 20,
        },
        style,
      ]}
    />
  );
}

/** "Précédent / page 2 sur 5 / Suivant", or nothing on a single page. */
export function Pager({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}): React.JSX.Element | null {
  if (pages <= 1) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <ActionChip
        label="Précédent"
        tone="neutral"
        disabled={page <= 1}
        onPress={() => {
          onChange(page - 1);
        }}
      />
      <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
        page {page} / {pages}
      </Text>
      <ActionChip
        label="Suivant"
        tone="neutral"
        disabled={page >= pages}
        onPress={() => {
          onChange(page + 1);
        }}
      />
    </View>
  );
}
