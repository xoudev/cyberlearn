import { computeTier } from "@cyberlearn/lib/gamification/tier";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { PathCardView } from "@/components/cards";
import { BellIcon, ChevronRight } from "@/components/icons";
import { Screen } from "@/components/screen";
import { Card, Pill, SectionLabel, Text, XPBar } from "@/components/ui";
import { CATEGORY_LABEL } from "@/lib/db";
import { useDashboard } from "@/lib/queries";
import { useSession } from "@/lib/session";

export default function Accueil(): React.JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data, isLoading, error } = useDashboard(userId);

  if (isLoading || !data) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {error ? (
            <Text variant="bodySm" style={{ color: colors.danger }}>
              Impossible de charger l&apos;accueil.
            </Text>
          ) : (
            <ActivityIndicator color={colors.accent} />
          )}
        </View>
      </Screen>
    );
  }

  const { me, level, rank, badges, resume, suggestedPaths } = data;
  const tier = computeTier(level.level);

  return (
    <Screen>
      {/* Greeting */}
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
        <BellIcon color={colors.textSecondary} size={22} />
      </View>

      {/* Level + XP */}
      <Card style={{ marginBottom: 20, gap: 10 }}>
        <View
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}
        >
          <Text variant="h3">Niveau {level.level}</Text>
          <Text variant="mono" style={{ color: colors.textMuted, fontSize: 11 }}>
            {level.current} / {level.needed} XP
          </Text>
        </View>
        <XPBar current={level.current} needed={level.needed} />
        <Text variant="micro" style={{ color: tier.tier.color }}>
          ◆ Palier {tier.tier.label}
        </Text>
      </Card>

      {/* Streak */}
      <SectionLabel eyebrow="Progression" title="Ta série" />
      <Card
        style={{
          marginBottom: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 30,
              color: colors.warning,
              fontFamily: `${fonts.sans}_800ExtraBold`,
            }}
          >
            {me.streakDays}
          </Text>
          <Text variant="micro">jours de série</Text>
        </View>
        <Text variant="bodySm" style={{ maxWidth: 150, textAlign: "right" }}>
          Ne casse pas la chaîne · record {me.longestStreak} j
        </Text>
      </Card>

      {/* Resume */}
      {resume ? (
        <View style={{ marginBottom: 20 }}>
          <SectionLabel title="Reprends où tu t'es arrêté" />
          <Pressable
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
          </Pressable>
        </View>
      ) : null}

      {/* Classement mini */}
      <SectionLabel
        title="Classement"
        right={
          <Text variant="micro" style={{ color: colors.accent }}>
            Division {tier.tier.label}
          </Text>
        }
      />
      <Card
        style={{
          marginBottom: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text variant="h2">{rank}e place</Text>
        <Pill label={`Palier ${tier.tier.label}`} color={tier.tier.color} />
      </Card>

      {/* Recent badges */}
      {badges.length > 0 ? (
        <View style={{ marginBottom: 20 }}>
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
        </View>
      ) : null}

      {/* Suggested paths */}
      <SectionLabel eyebrow="Suggérés pour toi" title="Parcours" />
      <View style={{ gap: 12 }}>
        {suggestedPaths.map((p) => (
          <PathCardView key={p.id} path={p} />
        ))}
      </View>
    </Screen>
  );
}
