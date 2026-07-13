import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { AnimatedXPBar, PressableScale, Rise } from "@/components/anim";
import { CheckIcon, ChevronRight } from "@/components/icons";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, SectionLabel, Text } from "@/components/ui";
import { CATEGORY_COLOR, CATEGORY_LABEL, DIFFICULTY_LABEL } from "@/lib/db";
import { usePathDetail, type PathMission } from "@/lib/queries";
import { useSession } from "@/lib/session";

type MissionState = "done" | "current" | "locked";

function missionStates(missions: PathMission[]): MissionState[] {
  let currentAssigned = false;
  return missions.map((m) => {
    if (m.status === "COMPLETED") return "done";
    if (!currentAssigned) {
      currentAssigned = true;
      return "current";
    }
    return "locked";
  });
}

export default function PathDetail(): React.JSX.Element {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { session } = useSession();
  const { data, isLoading, error, refetch } = usePathDetail(session?.user.id, slug);

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
        <Text variant="micro">← Retour · Parcours</Text>
      </Pressable>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="PATH_LOAD" />
      ) : (
        <PathBody
          data={data}
          onOpenLesson={(s) => router.push({ pathname: "/lessons/[slug]", params: { slug: s } })}
        />
      )}
    </Screen>
  );
}

function PathBody({
  data,
  onOpenLesson,
}: {
  data: NonNullable<ReturnType<typeof usePathDetail>["data"]>;
  onOpenLesson: (slug: string) => void;
}): React.JSX.Element {
  const cat = CATEGORY_COLOR[data.category];
  const total = data.missions.length;
  const pct = total > 0 ? Math.round((data.completedCount / total) * 100) : 0;
  const states = missionStates(data.missions);
  const currentIndex = states.indexOf("current");
  const resume = currentIndex >= 0 ? data.missions[currentIndex] : null;

  return (
    <View style={{ gap: 20 }}>
      {/* Hero */}
      <Rise index={0}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cat }} />
          <Text variant="micro" style={{ color: cat }}>
            {CATEGORY_LABEL[data.category]} · {DIFFICULTY_LABEL[data.difficulty]} · ~
            {data.estimatedHours} h
          </Text>
        </View>
        <Text variant="display" style={{ fontSize: 26 }}>
          {data.title}
        </Text>
        <Text variant="body" style={{ marginTop: 8 }}>
          {data.description}
        </Text>
      </Rise>

      {/* Progress */}
      <Rise index={1}>
        <Card style={{ gap: 10 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <Text variant="h3">Progression</Text>
            <Text variant="mono" style={{ color: colors.accent, fontSize: 12 }}>
              {data.completedCount}/{total} · {pct} %
            </Text>
          </View>
          <AnimatedXPBar current={data.completedCount} needed={Math.max(total, 1)} />
          {resume ? (
            <PressableScale
              onPress={() => onOpenLesson(resume.slug)}
              style={{
                marginTop: 6,
                height: 46,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.accent,
              }}
            >
              <Text variant="micro" style={{ color: colors.bgBase, letterSpacing: 1 }}>
                {data.completedCount > 0 ? "Reprendre" : "Commencer"} — Mission {currentIndex + 1}
              </Text>
            </PressableScale>
          ) : total > 0 ? (
            <View
              style={{
                marginTop: 6,
                height: 46,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.success,
              }}
            >
              <Text variant="micro" style={{ color: colors.success }}>
                ✓ Parcours terminé
              </Text>
            </View>
          ) : null}
        </Card>
      </Rise>

      {/* Missions timeline */}
      <Rise index={2}>
        <SectionLabel eyebrow="Missions" title={`${total} missions`} />
        <View>
          {data.missions.map((m, i) => {
            const state = states[i] ?? "locked";
            const isLast = i === total - 1;
            return (
              <View key={m.lessonId} style={{ flexDirection: "row" }}>
                {/* Timeline rail */}
                <View style={{ width: 34, alignItems: "center" }}>
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1.5,
                      borderColor:
                        state === "done"
                          ? colors.success
                          : state === "current"
                            ? colors.accent
                            : colors.borderDefault,
                      backgroundColor: state === "done" ? "rgba(10,255,212,0.12)" : "transparent",
                    }}
                  >
                    {state === "done" ? (
                      <CheckIcon color={colors.success} size={13} strokeWidth={2} />
                    ) : (
                      <Text
                        variant="mono"
                        style={{
                          fontSize: 10,
                          color: state === "current" ? colors.accent : colors.textDisabled,
                        }}
                      >
                        {i + 1}
                      </Text>
                    )}
                  </View>
                  {!isLast ? (
                    <View
                      style={{
                        flex: 1,
                        width: 1.5,
                        backgroundColor: state === "done" ? colors.success : colors.borderSubtle,
                        opacity: state === "done" ? 0.5 : 1,
                      }}
                    />
                  ) : null}
                </View>

                {/* Mission card */}
                <PressableScale
                  disabled={state === "locked"}
                  onPress={() => onOpenLesson(m.slug)}
                  style={{ flex: 1, marginBottom: 12 }}
                >
                  <Card
                    accent={state === "current" ? colors.accent : undefined}
                    style={{
                      opacity: state === "locked" ? 0.55 : 1,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      {state === "current" ? (
                        <Text variant="micro" style={{ color: colors.accent }}>
                          › Tu es ici
                        </Text>
                      ) : null}
                      <Text variant="h3" numberOfLines={2}>
                        {m.title}
                      </Text>
                      <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
                        {state === "locked"
                          ? "Complète la mission précédente"
                          : `${m.estimatedMinutes} min · +${m.xpReward} XP`}
                      </Text>
                    </View>
                    {state !== "locked" ? (
                      <ChevronRight
                        color={state === "current" ? colors.accent : colors.textMuted}
                        size={15}
                      />
                    ) : (
                      <Text
                        style={{
                          fontFamily: `${fonts.mono}_400Regular`,
                          fontSize: 13,
                          color: colors.textDisabled,
                        }}
                      >
                        ⬡
                      </Text>
                    )}
                  </Card>
                </PressableScale>
              </View>
            );
          })}
          {total === 0 ? <Pill label="Aucune mission publiée" color={colors.textMuted} /> : null}
        </View>
      </Rise>
    </View>
  );
}
