import { computeTier } from "@cyberlearn/lib/gamification/tier";
import { isoWeekKey } from "@cyberlearn/lib/gamification/week";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { AnimatedXPBar, CountUp, PressableScale, Pulse, Rise } from "@/components/anim";
import { PathCardView } from "@/components/cards";
import { BellIcon, ChevronRight } from "@/components/icons";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, SectionLabel, Text, XPBar } from "@/components/ui";
import { CATEGORY_LABEL } from "@/lib/db";
import { useDashboard, useQuests, useUnreadCount } from "@/lib/queries";
import { useSession } from "@/lib/session";

export default function Accueil(): React.JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data, isLoading, error, refetch } = useDashboard(userId);
  const weekKey = useMemo(() => isoWeekKey(new Date()), []);
  const { data: quests } = useQuests(userId, weekKey);
  const { data: unread } = useUnreadCount(userId);

  if (isLoading || !data) {
    return (
      <Screen>
        {error ? (
          <ErrorState onRetry={() => void refetch()} code="HOME_LOAD" />
        ) : (
          <ListSkeleton rows={4} />
        )}
      </Screen>
    );
  }

  const { me, level, rank, badges, resume, suggestedPaths } = data;
  const tier = computeTier(level.level);
  const activeQuests = (quests ?? []).filter((q) => !q.completed).length;

  return (
    <Screen>
      {/* Greeting */}
      <Rise index={0}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <View>
            <Text variant="micro" style={{ color: colors.accent }}>
              Bon retour
            </Text>
            <Text variant="h1">{me.username ? `@${me.username}` : me.displayName}</Text>
          </View>
          <Pressable onPress={() => router.push("/notifications")} style={{ padding: 6 }}>
            <BellIcon color={colors.textSecondary} size={22} />
            {(unread ?? 0) > 0 ? (
              <Pulse
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: colors.danger,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 3,
                }}
              >
                <Text style={{ fontFamily: `${fonts.mono}_700Bold`, fontSize: 9, color: "#fff" }}>
                  {unread}
                </Text>
              </Pulse>
            ) : null}
          </Pressable>
        </View>
      </Rise>

      {/* Level + XP */}
      <Rise index={1}>
        <Card style={{ marginBottom: 20, gap: 10 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <Text variant="h3">Niveau {level.level}</Text>
            <Text variant="mono" style={{ color: colors.textMuted, fontSize: 11 }}>
              {level.current} / {level.needed} XP
            </Text>
          </View>
          <AnimatedXPBar current={level.current} needed={level.needed} />
          <Text variant="micro" style={{ color: tier.tier.color }}>
            ◆ Palier {tier.tier.label}
          </Text>
        </Card>
      </Rise>

      {/* Streak */}
      <Rise index={2}>
        <SectionLabel eyebrow="Progression" title="Ta série" />
        <Card
          style={{
            marginBottom: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pulse amplitude={1.12}>
              <Text style={{ fontSize: 26 }}>🔥</Text>
            </Pulse>
            <View>
              <CountUp to={me.streakDays} fontSize={30} color={colors.warning} suffix="" />
              <Text variant="micro">jours de série</Text>
            </View>
          </View>
          <Text variant="bodySm" style={{ maxWidth: 140, textAlign: "right" }}>
            Ne casse pas la chaîne · record {me.longestStreak} j
          </Text>
        </Card>
      </Rise>

      {/* Weekly quests */}
      {(quests ?? []).length > 0 ? (
        <Rise index={3}>
          <SectionLabel
            eyebrow="Cette semaine"
            title="Quêtes hebdo"
            right={
              activeQuests > 0 ? (
                <Text variant="micro" style={{ color: colors.accent }}>
                  {activeQuests} en cours
                </Text>
              ) : (
                <Text variant="micro" style={{ color: colors.success }}>
                  ✓ complétées
                </Text>
              )
            }
          />
          <Card style={{ marginBottom: 20, gap: 14 }}>
            {(quests ?? []).map((q) => (
              <View key={q.id} style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <Text variant="h3" numberOfLines={1} style={{ flex: 1, fontSize: 13.5 }}>
                    {q.completed ? "✓ " : ""}
                    {q.title}
                  </Text>
                  <Text
                    variant="mono"
                    style={{ fontSize: 11, color: q.completed ? colors.success : colors.warning }}
                  >
                    {q.completed
                      ? "OK"
                      : `${String(Math.min(q.progress, q.target))}/${String(q.target)}`}{" "}
                    · +{q.xpReward} XP
                  </Text>
                </View>
                <XPBar current={Math.min(q.progress, q.target)} needed={q.target} height={4} />
              </View>
            ))}
          </Card>
        </Rise>
      ) : null}

      {/* Resume */}
      {resume ? (
        <Rise index={4} style={{ marginBottom: 20 }}>
          <SectionLabel title="Reprends où tu t'es arrêté" />
          <PressableScale
            onPress={() =>
              router.push({ pathname: "/lessons/[slug]", params: { slug: resume.slug } })
            }
          >
            <Card
              accent={colors.accent}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text variant="micro" style={{ color: colors.accent }}>
                  {CATEGORY_LABEL[resume.category]}
                </Text>
                <Text variant="h3" numberOfLines={1}>
                  {resume.title}
                </Text>
              </View>
              <ChevronRight color={colors.accent} size={18} />
            </Card>
          </PressableScale>
        </Rise>
      ) : null}

      {/* Classement mini */}
      <Rise index={5}>
        <SectionLabel
          title="Classement"
          right={
            <Text variant="micro" style={{ color: colors.accent }}>
              Palier {tier.tier.label}
            </Text>
          }
        />
        <PressableScale onPress={() => router.push("/classement")}>
          <Card
            style={{
              marginBottom: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text variant="h2">{rank}e place</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pill label={`Palier ${tier.tier.label}`} color={tier.tier.color} />
              <ChevronRight color={colors.textMuted} size={15} />
            </View>
          </Card>
        </PressableScale>
      </Rise>

      {/* Recent badges */}
      {badges.length > 0 ? (
        <Rise index={6} style={{ marginBottom: 20 }}>
          <SectionLabel eyebrow="Trophées" title="Ton butin récent" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            {badges.map((b) => (
              <Card
                key={b.name}
                style={{ flex: 1, alignItems: "center", gap: 6, paddingVertical: 14 }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: "rgba(10,255,212,0.08)",
                    borderWidth: 1,
                    borderColor: colors.borderDefault,
                  }}
                />
                <Text variant="micro" numberOfLines={1} style={{ color: colors.textSecondary }}>
                  {b.name}
                </Text>
              </Card>
            ))}
          </View>
        </Rise>
      ) : null}

      {/* Suggested paths */}
      <Rise index={7}>
        <SectionLabel eyebrow="Suggérés pour toi" title="Parcours" />
        <View style={{ gap: 12 }}>
          {suggestedPaths.map((p) => (
            <PathCardView key={p.id} path={p} />
          ))}
        </View>
      </Rise>
    </Screen>
  );
}
