import { useQuery } from "@tanstack/react-query";
import React from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { AnimatedXPBar } from "@/components/anim";
import { BadgeIcon } from "@/components/media";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, Text } from "@/components/ui";
import { type CollectionBadge, fetchBadgeCollectionApi } from "@/lib/api";
import { RARITY_COLOR, type Rarity } from "@/lib/db";

function isRarity(value: string): value is Rarity {
  return value in RARITY_COLOR;
}

function tint(rarity: string): string {
  return isRarity(rarity) ? RARITY_COLOR[rarity] : colors.textMuted;
}

/**
 * The profile's Collection tab, as the site's /badges page: every active
 * badge, earned or still locked, by rarity, with how far along the locked ones
 * are. The Badges tab next to it lists only what has been earned.
 */
export function BadgeCollectionList(): React.JSX.Element {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["badge-collection"],
    queryFn: fetchBadgeCollectionApi,
    staleTime: 60_000,
  });

  if (error) return <ErrorState onRetry={() => void refetch()} code="BADGES_LOAD" />;
  if (isLoading || !data) return <ListSkeleton rows={4} />;

  return (
    <View style={{ gap: 18 }}>
      <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
        <Text style={{ color: colors.textPrimary }}>{data.earnedCount}</Text> / {data.totalCount}
        {"  ·  "}Badges groupés par rareté
      </Text>
      {data.groups.map((group) => {
        const earned = group.badges.filter((b) => b.earned).length;
        return (
          <View key={group.rarity} style={{ gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text variant="micro" style={{ color: tint(group.rarity) }}>
                {group.label}
              </Text>
              <Text variant="micro">
                {earned} / {group.badges.length}
              </Text>
            </View>
            {group.badges.map((badge) => (
              <CollectionCard key={badge.id} badge={badge} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function CollectionCard({ badge }: { badge: CollectionBadge }): React.JSX.Element {
  const color = tint(badge.rarity);
  return (
    <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      {/* A locked badge is shown dimmed, as the site greys it out. */}
      <View style={{ opacity: badge.earned ? 1 : 0.35 }}>
        <BadgeIcon iconUrl={badge.iconUrl} color={color} size={40} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="h3" style={badge.earned ? undefined : { color: colors.textSecondary }}>
          {badge.name}
        </Text>
        <Text variant="bodySm">{badge.description}</Text>
        {badge.earned ? (
          <Text variant="micro" style={{ color }}>
            {badge.earnedDateStr ? `Obtenu le ${badge.earnedDateStr}` : "Obtenu"}
          </Text>
        ) : badge.progress && badge.progress.total > 0 ? (
          <View style={{ gap: 4, marginTop: 2 }}>
            {/* Same line as the site's card: the count and its unit, then the
                percentage in the rarity's colour. */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text variant="micro" style={{ flexShrink: 1 }}>
                <Text style={{ color: colors.textPrimary }}>
                  {badge.progress.done}/{badge.progress.total}
                </Text>{" "}
                {badge.progress.label}
              </Text>
              <Text variant="micro" style={{ color }}>
                {Math.round((badge.progress.done / badge.progress.total) * 100)}%
              </Text>
            </View>
            <AnimatedXPBar
              current={Math.min(badge.progress.done, badge.progress.total)}
              needed={badge.progress.total}
              height={3}
              delay={0}
            />
          </View>
        ) : (
          <Text variant="micro">Verrouillé</Text>
        )}
      </View>
    </Card>
  );
}
