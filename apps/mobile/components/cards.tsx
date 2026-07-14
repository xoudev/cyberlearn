import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { Card, Pill, Text } from "@/components/ui";
import { CATEGORY_COLOR, CATEGORY_LABEL, DIFFICULTY_LABEL, type ProgressStatus } from "@/lib/db";
import type { LessonCard, PathCard } from "@/lib/queries";

function pathCta(status: ProgressStatus | null): string {
  if (status === "IN_PROGRESS") return "Reprendre";
  if (status === "COMPLETED") return "Revoir";
  return "Commencer";
}

export const PathCardView = React.memo(function PathCardView({
  path,
}: {
  path: PathCard;
}): React.JSX.Element {
  const router = useRouter();
  const cat = CATEGORY_COLOR[path.category];
  return (
    <PressableScale
      onPress={() => router.push({ pathname: "/paths/[slug]", params: { slug: path.slug } })}
    >
      <Card accent={cat} style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cat }} />
          <Text variant="micro" style={{ color: cat }}>
            {CATEGORY_LABEL[path.category]} · {DIFFICULTY_LABEL[path.difficulty]}
          </Text>
        </View>
        <Text variant="h3">{path.title}</Text>
        <Text variant="bodySm" numberOfLines={2}>
          {path.description}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          <Text variant="mono" style={{ color: colors.textMuted, fontSize: 11 }}>
            {path.missions} mission{path.missions > 1 ? "s" : ""}
          </Text>
          <Pill
            label={pathCta(path.status)}
            color={colors.accent}
            active={path.status === "IN_PROGRESS"}
          />
        </View>
      </Card>
    </PressableScale>
  );
});

export const LessonCardView = React.memo(function LessonCardView({
  lesson,
}: {
  lesson: LessonCard;
}): React.JSX.Element {
  const router = useRouter();
  const cat = CATEGORY_COLOR[lesson.category];
  return (
    <PressableScale
      onPress={() => router.push({ pathname: "/lessons/[slug]", params: { slug: lesson.slug } })}
    >
      <Card accent={cat} style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cat }} />
          <Text variant="micro" style={{ color: cat }}>
            {CATEGORY_LABEL[lesson.category]} · {DIFFICULTY_LABEL[lesson.difficulty]}
          </Text>
        </View>
        <Text variant="h3">{lesson.title}</Text>
        <Text variant="bodySm" numberOfLines={2}>
          {lesson.description}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          <Text variant="mono" style={{ color: colors.textMuted, fontSize: 11 }}>
            {lesson.estimatedMinutes} min · +{lesson.xpReward} XP
          </Text>
          {lesson.status === "COMPLETED" ? (
            <Pill label="Terminé" color={colors.success} />
          ) : lesson.status === "IN_PROGRESS" ? (
            <Pill label="En cours" color={colors.accent} active />
          ) : null}
        </View>
      </Card>
    </PressableScale>
  );
});
