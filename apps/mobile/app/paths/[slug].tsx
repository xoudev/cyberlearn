import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { AnimatedXPBar, PressableScale, Rise } from "@/components/anim";
import { CheckIcon, ChevronRight, LockIcon } from "@/components/icons";
import { BackButton, GradientButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, SectionLabel, Text } from "@/components/ui";
import { CATEGORY_COLOR, CATEGORY_LABEL, DIFFICULTY_LABEL } from "@/lib/db";
import { usePathDetail, type PathMission } from "@/lib/queries";
import { PathFinalCard } from "@/components/path-final-card";
import { PathRatingCard } from "@/components/path-rating";
import { averageLine } from "@/lib/rating";
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
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Parcours" />
      </View>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="PATH_LOAD" />
      ) : (
        <PathBody
          data={data}
          userId={session?.user.id}
          onOpenLesson={(s) => router.push({ pathname: "/lessons/[slug]", params: { slug: s } })}
          onRated={() => void refetch()}
        />
      )}
    </Screen>
  );
}

function PathBody({
  data,
  userId,
  onOpenLesson,
  onRated,
}: {
  data: NonNullable<ReturnType<typeof usePathDetail>["data"]>;
  userId: string | undefined;
  onOpenLesson: (slug: string) => void;
  onRated: () => void;
}): React.JSX.Element {
  const average = averageLine(data.avgRating, data.ratingsCount);
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
        {average ? (
          <Text variant="mono" style={{ marginTop: 8, fontSize: 12, color: colors.textSecondary }}>
            <Text style={{ color: colors.warning }}>★</Text> {average}
          </Text>
        ) : null}
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
            <GradientButton
              label={`${data.completedCount > 0 ? "REPRENDRE" : "COMMENCER"} - MISSION ${String(currentIndex + 1)}`}
              onPress={() => onOpenLesson(resume.slug)}
              style={{ marginTop: 6 }}
            />
          ) : total > 0 ? (
            <View
              style={{
                marginTop: 6,
                height: 48,
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

      {/* Missions */}
      <Rise index={2}>
        <SectionLabel eyebrow="Parcours" title={`${total} missions`} />
        <View style={{ gap: 10 }}>
          {data.missions.map((m, i) => {
            const state = states[i] ?? "locked";
            const stateColor =
              state === "done"
                ? colors.success
                : state === "current"
                  ? colors.accent
                  : colors.textDisabled;
            return (
              <PressableScale
                key={m.lessonId}
                disabled={state === "locked"}
                onPress={() => onOpenLesson(m.slug)}
              >
                <Card
                  accent={state === "current" ? colors.accent : undefined}
                  style={{
                    opacity: state === "locked" ? 0.6 : 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    paddingVertical: 14,
                  }}
                >
                  {/* Number / state chip */}
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1.5,
                      borderColor: stateColor,
                      backgroundColor:
                        state === "done"
                          ? "rgba(10,255,212,0.10)"
                          : state === "current"
                            ? "rgba(10,255,212,0.06)"
                            : "transparent",
                    }}
                  >
                    {state === "done" ? (
                      <CheckIcon color={colors.success} size={15} strokeWidth={2} />
                    ) : state === "locked" ? (
                      <LockIcon color={colors.textDisabled} size={14} strokeWidth={1.4} />
                    ) : (
                      <Text
                        style={{
                          fontFamily: `${fonts.mono}_700Bold`,
                          fontSize: 13,
                          lineHeight: 17,
                          color: colors.accent,
                        }}
                      >
                        {i + 1}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="micro" style={{ color: stateColor, letterSpacing: 1 }}>
                      {state === "done"
                        ? `Mission ${String(i + 1)} · terminée`
                        : state === "current"
                          ? `Mission ${String(i + 1)} · tu es ici`
                          : `Mission ${String(i + 1)}`}
                    </Text>
                    <Text
                      variant="h3"
                      numberOfLines={2}
                      style={state === "locked" ? { color: colors.textSecondary } : undefined}
                    >
                      {m.title}
                    </Text>
                    <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
                      {state === "locked"
                        ? "Termine la mission précédente pour déverrouiller"
                        : `${m.estimatedMinutes} min · +${m.xpReward} XP`}
                    </Text>
                  </View>

                  {state !== "locked" ? (
                    <ChevronRight
                      color={state === "current" ? colors.accent : colors.textMuted}
                      size={15}
                    />
                  ) : null}
                </Card>
              </PressableScale>
            );
          })}
          {total === 0 ? <Pill label="Aucune mission publiée" color={colors.textMuted} /> : null}
        </View>
      </Rise>

      {total > 0 ? (
        <Rise index={3}>
          <PathFinalCard userId={userId} slug={data.slug} missionCount={total} />
        </Rise>
      ) : null}

      <Rise index={4}>
        <PathRatingCard pathId={data.id} canRate={data.completedCount > 0} onRated={onRated} />
      </Rise>
    </View>
  );
}
