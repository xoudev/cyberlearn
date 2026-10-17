import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Switch, View, type ViewStyle } from "react-native";
import { colors, division as divisionColors, fonts } from "@cyberlearn/tokens";
import { BackButton } from "@/components/buttons";
import { FriendMark } from "@/components/friends";
import { Avatar } from "@/components/media";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, SectionLabel, Text } from "@/components/ui";
import {
  fetchLeaderboard,
  type FriendsBoard,
  type LeaderboardEntry,
  type PodEntry,
} from "@/lib/api";
import { boardName, friendsBoardNotice, friendsCountLabel, showsFriendMark } from "@/lib/friends";
import {
  PERIOD_CHIPS,
  emptyBoardLabel,
  hasPodium,
  rowAvatarName,
  topListEyebrow,
  topListRows,
  type LeaderboardPeriod,
} from "@/lib/leaderboard";
import { PREFERENCE_NOT_SAVED, updatePreference } from "@/lib/queries";
import { useSession } from "@/lib/session";

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

/** The previous period's board, still on screen while the next one loads. */
const STALE_STYLE: ViewStyle = { opacity: 0.45 };

export default function Leaderboard(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  const [board, setBoard] = useState<Board>("global");
  // The site's periods, for both boards: the server reads them from the
  // ledger, Monday and the 1st in Paris time.
  const [period, setPeriod] = useState<LeaderboardPeriod>("all");
  const { data, isLoading, isPlaceholderData, error, refetch } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => fetchLeaderboard(period),
    // The board stays on screen while the next period loads, dimmed and
    // worded by the period it really is (data.period) until the new one comes.
    placeholderData: keepPreviousData,
  });
  const [listing, setListing] = useState(false);

  /**
   * "Visible par mes amis", from the friends tab: the same switch as in the
   * settings, written the same way (prefs_self_all RLS), where an empty
   * friends board is the moment the question makes sense. A write that did
   * not go through is said, in the site's words; the switch stays where the
   * board says the reader is.
   */
  async function setListed(value: boolean): Promise<void> {
    if (!userId) return;
    setListing(true);
    try {
      await updatePreference(userId, "friendsLeaderboard", value);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
        queryClient.invalidateQueries({ queryKey: ["preferences", userId] }),
      ]);
    } catch {
      Alert.alert(PREFERENCE_NOT_SAVED);
    } finally {
      setListing(false);
    }
  }
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const topRows = data ? topListRows(data.entries) : [];

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
          <View style={isPlaceholderData ? STALE_STYLE : null}>
            <MyRankCard data={data} />
          </View>

          <BoardSwitch value={board} onChange={setBoard} />
          <PeriodSwitch
            value={period}
            onChange={setPeriod}
            since={data.periodSince}
            loading={isPlaceholderData}
          />

          {/* Everything under the switches belongs to data.period: while the
              chip just tapped loads, it is the previous period's, dimmed. */}
          <View
            accessibilityState={{ busy: isPlaceholderData }}
            style={[{ gap: 24 }, isPlaceholderData ? STALE_STYLE : null]}
          >
            {board === "friends" ? (
              <FriendsSection
                board={data.friendsBoard}
                listing={listing}
                onSetListed={(value) => void setListed(value)}
              />
            ) : null}

            {/* Podium top 3 */}
            {board === "global" && hasPodium(data.entries) ? (
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

            {/* Global top: the rows the podium has not taken, all of them
                when there is no podium. Exactly three players fill the podium
                and leave the list nothing to say. */}
            {board === "global" && (data.entries.length === 0 || topRows.length > 0) ? (
              <View>
                <SectionLabel eyebrow={topListEyebrow(data.period)} title="Top classement" />
                {data.entries.length === 0 ? (
                  <Text variant="bodySm">{emptyBoardLabel(data.period)}</Text>
                ) : (
                  <Card style={{ padding: 0 }}>
                    {topRows.map((e: LeaderboardEntry, i) => (
                      <GlobalRow key={`${String(e.rank)}-${String(i)}`} entry={e} />
                    ))}
                  </Card>
                )}
              </View>
            ) : null}
          </View>
        </View>
      )}
    </Screen>
  );
}

// ── My position card ──────────────────────────────────────────────────────────

/** Who a board leaves out, as the site says it under "Tu n'apparais pas…". */
const UNRANKED_DETAIL: Record<LeaderboardPeriod, string> = {
  all: "Il compte les apprenants à partir de leur premier XP.",
  month: "Il compte les apprenants qui ont gagné de l'XP depuis le début du mois.",
  week: "Il compte les apprenants qui ont gagné de l'XP depuis lundi.",
};

function MyRankCard({
  data,
}: {
  /** One answer, period included: the place and the words always agree. */
  data: {
    userRank: number;
    entries: LeaderboardEntry[];
    league: { division: string } | null;
    totalPlayers: number | null;
    period: LeaderboardPeriod;
  };
}): React.JSX.Element {
  const me = data.entries.find((e) => e.isCurrentUser) ?? null;
  // 0 is the server's "not ranked": the same words as the site's leaderboard
  // rather than "0e place".
  if (data.userRank < 1) {
    return (
      <Card style={{ gap: 4, paddingVertical: 18 }}>
        <Text variant="h3">Tu n&apos;apparais pas dans ce classement</Text>
        <Text variant="bodySm">
          {UNRANKED_DETAIL[data.period]} Un compte de l&apos;équipe ou un profil masqué dans les
          paramètres n&apos;y figure pas.
        </Text>
      </Card>
    );
  }
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
        <Text variant="micro">
          {data.totalPlayers !== null ? `sur ${String(data.totalPlayers)}` : "place"}
        </Text>
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
  const avatarSize = place === 1 ? 56 : 48;
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
      {/* The player's picture, the place on a medal at its corner. */}
      <View style={{ width: avatarSize, height: avatarSize }}>
        <Avatar
          key={entry.avatarSrc ?? "initials"}
          avatarUrl={entry.avatarSrc ?? null}
          displayName={rowAvatarName(entry)}
          size={avatarSize}
          color={medal}
        />
        <View
          style={{
            position: "absolute",
            right: -4,
            bottom: -2,
            minWidth: 20,
            height: 20,
            paddingHorizontal: 4,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: medal,
            borderWidth: 2,
            borderColor: colors.bgBase,
          }}
        >
          <Text
            style={{
              fontFamily: `${fonts.sans}_800ExtraBold`,
              fontSize: 11,
              lineHeight: 14,
              color: colors.bgBase,
            }}
          >
            {place}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", maxWidth: 110 }}>
        <Text
          variant="micro"
          numberOfLines={1}
          style={{
            color: entry.isCurrentUser ? colors.accent : colors.textSecondary,
            flexShrink: 1,
          }}
        >
          {displayName(entry)}
        </Text>
        {showsFriendMark(entry) ? <FriendMark size={11} /> : null}
      </View>
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
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", minWidth: 0 }}>
        <Text
          variant="h3"
          numberOfLines={1}
          style={{
            flexShrink: 1,
            color: member.isCurrentUser ? colors.accent : colors.textPrimary,
            fontSize: 13.5,
          }}
        >
          {member.isCurrentUser ? `› ${displayName(member)}` : displayName(member)}
        </Text>
        {showsFriendMark(member) ? <FriendMark /> : null}
      </View>
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
  markFriends = true,
}: {
  entry: LeaderboardEntry;
  /** The friends board names everybody; the public board may not. */
  name?: string;
  /** Off on the friends board, where every row but the reader's is a friend. */
  markFriends?: boolean;
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
      <Avatar
        key={entry.avatarSrc ?? "initials"}
        avatarUrl={entry.avatarSrc ?? null}
        displayName={rowAvatarName(entry)}
        size={30}
      />
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", minWidth: 0 }}>
        <Text
          variant="h3"
          numberOfLines={1}
          style={{
            flexShrink: 1,
            fontSize: 13.5,
            color: entry.isCurrentUser ? colors.accent : colors.textPrimary,
          }}
        >
          {entry.isCurrentUser ? `› ${name}` : name}
        </Text>
        {markFriends && showsFriendMark(entry) ? <FriendMark /> : null}
      </View>
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

/**
 * The period, under the board switch: all time, this month, this week. The
 * line under the chips says since when a period counts, in the server's words;
 * while the chip just tapped loads, it says that instead, since the "since"
 * on hand is still the previous period's.
 */
function PeriodSwitch({
  value,
  onChange,
  since,
  loading,
}: {
  value: LeaderboardPeriod;
  onChange: (period: LeaderboardPeriod) => void;
  since: string | null;
  /** The board on screen is the previous period's: `value` is on its way. */
  loading: boolean;
}): React.JSX.Element {
  return (
    <View style={{ gap: 6, marginTop: -12 }}>
      <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 6 }}>
        {PERIOD_CHIPS.map((chip) => {
          const active = chip.id === value;
          return (
            <Pressable
              key={chip.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => onChange(chip.id)}
              style={{
                flex: 1,
                minHeight: 36,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: active ? colors.accent : colors.borderSubtle,
                backgroundColor: active ? "rgba(10,255,212,0.08)" : "transparent",
              }}
            >
              <Text
                variant="micro"
                style={{ color: active ? colors.accent : colors.textMuted }}
                numberOfLines={1}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {loading ? (
        <View
          accessibilityLiveRegion="polite"
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <ActivityIndicator color={colors.accent} size="small" />
          <Text variant="micro" style={{ color: colors.textMuted }}>
            Chargement du classement…
          </Text>
        </View>
      ) : since !== null ? (
        <Text variant="micro" style={{ color: colors.textMuted }}>
          {since}
        </Text>
      ) : null}
    </View>
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
  listing,
  onSetListed,
}: {
  board: FriendsBoard;
  /** The switch is being saved. */
  listing: boolean;
  onSetListed: (value: boolean) => void;
}): React.JSX.Element {
  const others = board.entries.filter((e) => !e.isCurrentUser);
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
            <GlobalRow key={String(e.rank)} entry={e} name={boardName(e)} markFriends={false} />
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
          gap: 10,
        }}
      >
        <Text variant="mono" style={{ fontSize: 11.5, lineHeight: 18, color: colors.textMuted }}>
          {friendsBoardNotice(board.listedForFriends)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text variant="h3" style={{ flex: 1, fontSize: 13.5 }}>
            Visible par mes amis
          </Text>
          <Switch
            accessibilityLabel="Apparaître dans le classement de mes amis"
            value={board.listedForFriends}
            disabled={listing}
            onValueChange={onSetListed}
            trackColor={{ false: colors.bgOverlay, true: "rgba(10,255,212,0.35)" }}
            thumbColor={board.listedForFriends ? colors.accent : colors.textMuted}
          />
        </View>
      </View>
    </View>
  );
}
