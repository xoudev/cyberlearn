import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { colors, division as divisionColors, fonts } from "@cyberlearn/tokens";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, SectionLabel, Text } from "@/components/ui";
import {
  fetchLeaderboard,
  type FriendsBoard,
  type LeaderboardEntry,
  type PodEntry,
} from "@/lib/api";
import { boardName, friendsBoardNotice, friendsCountLabel } from "@/lib/friends";

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

/** The site's two boards that the app has: the platform, and the reader's friends. */
const BOARDS = [
  { id: "global", label: "Général" },
  { id: "friends", label: "Amis" },
] as const;
type Board = (typeof BOARDS)[number]["id"];

export default function Leaderboard(): React.JSX.Element {
  const router = useRouter();
  const [board, setBoard] = useState<Board>("global");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="RANK_LOAD" />
      ) : (
        <View style={{ gap: 24 }}>
          {/* My position */}
          <MyRankCard data={data} />

          <BoardSwitch value={board} onChange={setBoard} />

          {board === "friends" ? (
            <FriendsSection
              board={data.friendsBoard}
              onOpenSettings={() => router.push("/settings")}
            />
          ) : null}

          {/* Podium top 3 */}
          {board === "global" && data.entries.length >= 3 ? (
            <Podium entries={data.entries.slice(0, 3)} />
          ) : null}

          {/* League pod */}
          {board === "global" && data.league ? (
            <View>
              <SectionLabel
                eyebrow="Saison en cours"
                title={`Division ${DIVISION_LABEL[data.league.division] ?? data.league.division}`}
                right={
                  <Text variant="micro" style={{ color: colors.warning }}>
                    Fin · {countdown(data.league.seasonEndsAt, now)}
                  </Text>
                }
              />
              <View
                style={{
                  borderTopWidth: 2,
                  borderTopColor: divisionColor(data.league.division),
                }}
              >
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
              </View>
              <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
                <Text variant="micro" style={{ color: colors.promote }}>
                  ▲ Zone de promotion
                </Text>
                <Text variant="micro" style={{ color: colors.relegate }}>
                  ▼ Zone de relégation
                </Text>
              </View>
            </View>
          ) : null}

          {/* Global top */}
          {board === "global" ? (
            <View>
              <SectionLabel eyebrow="Général" title="Top classement" />
              <Card style={{ padding: 0 }}>
                {data.entries.slice(3, 25).map((e: LeaderboardEntry, i) => (
                  <GlobalRow key={`${String(e.rank)}-${String(i)}`} entry={e} />
                ))}
              </Card>
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

// ── My position card ──────────────────────────────────────────────────────────

function MyRankCard({
  data,
}: {
  data: { userRank: number; entries: LeaderboardEntry[]; league: { division: string } | null };
}): React.JSX.Element {
  const me = data.entries.find((e) => e.isCurrentUser) ?? null;
  return (
    <Card
      accent={colors.accent}
      style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 18 }}
    >
      <View style={{ alignItems: "center", minWidth: 76 }}>
        <Text
          style={{
            fontFamily: `${fonts.sans}_800ExtraBold`,
            fontSize: 34,
            lineHeight: 42,
            color: colors.accent,
          }}
        >
          {data.userRank}
          <Text style={{ fontSize: 16, color: colors.accent }}>e</Text>
        </Text>
        <Text variant="micro">place</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="h3">Ta position</Text>
        <Text variant="bodySm">
          {me
            ? `NV.${String(me.level)} · ${String(me.xpTotal)} XP · série ${String(me.streakDays)} j`
            : "Continue à gagner de l'XP pour grimper."}
        </Text>
        {data.league ? (
          <Pill
            label={`Ligue ${DIVISION_LABEL[data.league.division] ?? data.league.division}`}
            color={divisionColor(data.league.division)}
          />
        ) : null}
      </View>
    </Card>
  );
}

// ── Podium ────────────────────────────────────────────────────────────────────

const MEDAL = ["#FFD34D", "#C9D1E5", "#D08A4E"] as const; // or, argent, bronze

function PodiumStep({
  entry,
  place,
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
}): React.JSX.Element {
  const medal = MEDAL[place - 1] ?? colors.accent;
  const height = place === 1 ? 86 : place === 2 ? 64 : 50;
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 2,
          borderColor: medal,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: `${medal}14`,
        }}
      >
        <Text style={{ fontFamily: `${fonts.sans}_800ExtraBold`, fontSize: 16, color: medal }}>
          {place}
        </Text>
      </View>
      <Text
        variant="micro"
        numberOfLines={1}
        style={{ color: entry.isCurrentUser ? colors.accent : colors.textSecondary, maxWidth: 100 }}
      >
        {displayName(entry)}
      </Text>
      <View
        style={{
          alignSelf: "stretch",
          height,
          borderWidth: 1,
          borderColor: medal,
          borderBottomWidth: 0,
          backgroundColor: `${medal}10`,
          alignItems: "center",
          paddingTop: 8,
        }}
      >
        <Text variant="mono" style={{ fontSize: 11, color: medal }}>
          {entry.xpTotal} XP
        </Text>
        <Text variant="micro" style={{ color: colors.textMuted, marginTop: 2 }}>
          NV.{entry.level}
        </Text>
      </View>
    </View>
  );
}

function Podium({ entries }: { entries: LeaderboardEntry[] }): React.JSX.Element {
  const [first, second, third] = entries;
  if (!first || !second || !third) return <View />;
  return (
    <View>
      <SectionLabel eyebrow="Hall of fame" title="Podium" />
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 8,
          borderBottomWidth: 2,
          borderBottomColor: colors.borderDefault,
        }}
      >
        <PodiumStep entry={second} place={2} />
        <PodiumStep entry={first} place={1} />
        <PodiumStep entry={third} place={3} />
      </View>
    </View>
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

function GlobalRow({
  entry,
  name = displayName(entry),
}: {
  entry: LeaderboardEntry;
  /** The friends board names everybody; the public board may not. */
  name?: string;
}): React.JSX.Element {
  const top3 = entry.rank <= 3;
  return (
    <ProfileLink
      username={entry.hasPublicProfile ? entry.username : null}
      name={name}
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
        {entry.isCurrentUser ? `› ${name}` : name}
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
    </ProfileLink>
  );
}

/**
 * A board row that opens the person's profile, when the server says their
 * name may be a link (hasPublicProfile): a public profile on the public
 * board, any friend with a handle on the friends board. Otherwise a plain row.
 */
function ProfileLink({
  username,
  name,
  style,
  children,
}: {
  username: string | null;
  name: string;
  style: ViewStyle;
  children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  if (username === null) return <View style={style}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Profil de ${name}`}
      onPress={() => router.push({ pathname: "/u/[username]", params: { username } })}
      style={({ pressed }) => [style, pressed ? { opacity: 0.7 } : null]}
    >
      {children}
    </Pressable>
  );
}

function BoardSwitch({
  value,
  onChange,
}: {
  value: Board;
  onChange: (board: Board) => void;
}): React.JSX.Element {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 8 }}>
      {BOARDS.map((b) => {
        const active = b.id === value;
        return (
          <Pressable
            key={b.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(b.id)}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: active ? colors.accent : colors.borderDefault,
              backgroundColor: active ? colors.accent : "transparent",
            }}
          >
            <Text variant="micro" style={{ color: active ? colors.bgBase : colors.textSecondary }}>
              {b.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The friends board, as on the site. Nobody is anonymised and nobody is
 * greyed out: on a list this short, "Anonyme" would be a name with one step
 * missing. Somebody is listed under their name because they said so, or they
 * are absent; the notice says which of the two the reader is.
 */
function FriendsSection({
  board,
  onOpenSettings,
}: {
  board: FriendsBoard;
  onOpenSettings: () => void;
}): React.JSX.Element {
  const others = board.entries.filter((e) => !e.isCurrentUser);
  const notice = friendsBoardNotice(board.listedForFriends);
  return (
    <View>
      <SectionLabel
        eyebrow="Entre amis"
        title="Tes amis"
        right={
          <Text variant="micro" style={{ color: colors.textMuted }}>
            {friendsCountLabel(others.length)}
          </Text>
        }
      />
      {board.entries.length === 0 ? (
        <Text variant="bodySm" style={{ marginBottom: 16 }}>
          Rien à classer pour l'instant : ce tableau réunit les amis qui ont choisi d'y figurer.
        </Text>
      ) : (
        <Card style={{ padding: 0 }}>
          {board.entries.map((e) => (
            <GlobalRow key={String(e.rank)} entry={e} name={boardName(e)} />
          ))}
        </Card>
      )}
      <View
        style={{
          marginTop: 16,
          borderWidth: 1,
          borderColor: colors.borderDefault,
          backgroundColor: "rgba(5,4,26,0.5)",
          padding: 14,
          gap: 8,
        }}
      >
        <Text variant="mono" style={{ fontSize: 11.5, lineHeight: 18, color: colors.textMuted }}>
          {notice.text}
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={onOpenSettings}
          hitSlop={8}
          style={{ alignSelf: "flex-start", minHeight: 32, justifyContent: "center" }}
        >
          <Text variant="micro" style={{ color: colors.accent }}>
            {`${notice.link} →`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
