import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { colors, division as divisionColors, fonts } from "@cyberlearn/tokens";
import { Rise } from "@/components/anim";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, SectionLabel, Text } from "@/components/ui";
import { fetchClassement, type ClassementEntry, type PodEntry } from "@/lib/api";

const DIVISION_LABEL: Record<string, string> = {
  BRONZE: "Bronze",
  ARGENT: "Argent",
  OR: "Or",
  PLATINE: "Platine",
  DIAMANT: "Diamant",
};

function divisionColor(code: string): string {
  return (divisionColors as Record<string, string>)[code] ?? colors.accent;
}

function countdown(endsAtIso: string, now: number): string {
  const ms = new Date(endsAtIso).getTime() - now;
  if (ms <= 0) return "clôture imminente";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return `${String(days)} j ${String(hours)} h`;
}

function displayName(e: {
  displayName: string | null;
  username: string | null;
  isCurrentUser: boolean;
}): string {
  if (e.username) return `@${e.username}`;
  if (e.displayName) return e.displayName;
  return e.isCurrentUser ? "Toi" : "Anonyme";
}

export default function Classement(): React.JSX.Element {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["classement"],
    queryFn: fetchClassement,
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
        <Text variant="micro">← Retour</Text>
      </Pressable>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="RANK_LOAD" />
      ) : (
        <View style={{ gap: 22 }}>
          {/* League pod */}
          {data.league ? (
            <Rise index={0}>
              <SectionLabel
                eyebrow="Saison en cours"
                title={`Division ${DIVISION_LABEL[data.league.division] ?? data.league.division}`}
                right={
                  <Text variant="micro" style={{ color: colors.warning }}>
                    Fin · {countdown(data.league.seasonEndsAt, now)}
                  </Text>
                }
              />
              <Card style={{ padding: 0 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderSubtle,
                  }}
                >
                  <Text variant="micro" style={{ color: divisionColor(data.league.division) }}>
                    ◆ Poule de {data.league.ladder.length}
                  </Text>
                  <Text variant="micro">XP de saison</Text>
                </View>
                {data.league.ladder.map((m: PodEntry, i) => (
                  <LadderRow
                    key={`${String(m.rank)}-${m.username ?? String(i)}`}
                    member={m}
                    index={i}
                  />
                ))}
              </Card>
              <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
                <Text variant="micro" style={{ color: colors.promote }}>
                  ▲ Zone de promotion
                </Text>
                <Text variant="micro" style={{ color: colors.relegate }}>
                  ▼ Zone de relégation
                </Text>
              </View>
            </Rise>
          ) : null}

          {/* Global top */}
          <Rise index={1}>
            <SectionLabel
              eyebrow="Général"
              title="Top classement"
              right={
                <Pill label={`Toi · ${String(data.userRank)}e`} color={colors.accent} active />
              }
            />
            <Card style={{ padding: 0 }}>
              {data.entries.slice(0, 25).map((e: ClassementEntry, i) => (
                <GlobalRow key={`${String(e.rank)}-${String(i)}`} entry={e} />
              ))}
            </Card>
          </Rise>
        </View>
      )}
    </Screen>
  );
}

function LadderRow({ member, index }: { member: PodEntry; index: number }): React.JSX.Element {
  const zone = member.promotion ? colors.promote : member.relegation ? colors.relegate : null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
        backgroundColor: member.isCurrentUser
          ? "rgba(10,255,212,0.07)"
          : index % 2
            ? "rgba(5,4,26,0.4)"
            : "transparent",
        borderLeftWidth: member.isCurrentUser ? 3 : 0,
        borderLeftColor: colors.accent,
      }}
    >
      <Text variant="mono" style={{ width: 26, fontSize: 12, color: zone ?? colors.textMuted }}>
        {member.promotion ? "▲" : member.relegation ? "▼" : ""}
        {member.rank}
      </Text>
      <Text
        variant="h3"
        numberOfLines={1}
        style={{
          flex: 1,
          color: member.isCurrentUser ? colors.accent : colors.textPrimary,
          fontSize: 13.5,
        }}
      >
        {member.isCurrentUser ? `› ${displayName(member)}` : displayName(member)}
      </Text>
      <Text variant="micro" style={{ color: colors.textMuted }}>
        NV.{member.level}
      </Text>
      <Text
        style={{
          fontFamily: `${fonts.mono}_700Bold`,
          fontSize: 12.5,
          color: zone ?? colors.textSecondary,
          width: 74,
          textAlign: "right",
        }}
      >
        {member.seasonXp} XP
      </Text>
    </View>
  );
}

function GlobalRow({ entry }: { entry: ClassementEntry }): React.JSX.Element {
  const top3 = entry.rank <= 3;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
        backgroundColor: entry.isCurrentUser ? "rgba(10,255,212,0.07)" : "transparent",
        borderLeftWidth: entry.isCurrentUser ? 3 : 0,
        borderLeftColor: colors.accent,
      }}
    >
      <Text
        variant="mono"
        style={{ width: 30, fontSize: 12, color: top3 ? colors.warning : colors.textMuted }}
      >
        {entry.rank}
      </Text>
      <Text
        variant="h3"
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: 13.5,
          color: entry.isCurrentUser ? colors.accent : colors.textPrimary,
        }}
      >
        {entry.isCurrentUser ? `› ${displayName(entry)}` : displayName(entry)}
      </Text>
      <Text variant="micro" style={{ color: colors.textMuted }}>
        NV.{entry.level}
      </Text>
      <Text
        style={{
          fontFamily: `${fonts.mono}_700Bold`,
          fontSize: 12.5,
          color: colors.textSecondary,
          width: 84,
          textAlign: "right",
        }}
      >
        {entry.xpTotal} XP
      </Text>
    </View>
  );
}
