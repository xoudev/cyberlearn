import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import {
  FRIENDSHIP_ACTION_LABEL,
  friendshipAfter,
  friendshipMove,
} from "@cyberlearn/lib/social/friendship";
import { colors, fonts } from "@cyberlearn/tokens";
import { ActionChip, BackButton, GradientButton } from "@/components/buttons";
import { Avatar, BadgeIcon } from "@/components/media";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Divider, SectionLabel, StatCell, Text, XPBar } from "@/components/ui";
import { fetchProfileApi, removeFriendApi, requestFriendApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import { CATEGORY_COLOR, CATEGORY_LABEL, RARITY_COLOR } from "@/lib/db";
import {
  joinedLabel,
  profileCategory,
  profileEyebrow,
  profileRarity,
  shortDay,
  type FriendshipView,
  type PublicProfile,
} from "@/lib/friends";

/**
 * Somebody's profile page: the site's /u/[username]. Who gets in is the
 * server's rule (anybody on a public profile, only friends on a closed one),
 * and a closed profile reads exactly like a handle that does not exist. The
 * one thing a visitor can do here is the friend button, as on the site.
 */
export default function PublicProfileScreen(): React.JSX.Element {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["profile", username],
    enabled: Boolean(username),
    queryFn: () => fetchProfileApi(username),
  });

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} code="PROFILE_PUBLIC" />
      ) : !data ? (
        <EmptyState
          title="Profil introuvable"
          body="Ce pseudo n'existe pas, ou son profil n'est ouvert qu'à ses amis."
        />
      ) : (
        <ProfileBody profile={data} />
      )}
    </Screen>
  );
}

function ProfileBody({ profile }: { profile: PublicProfile }): React.JSX.Element {
  const { theme } = useCosmetics();
  const fr = (value: number): string => value.toLocaleString("fr-FR");
  const percent =
    profile.level.needed > 0
      ? Math.round(Math.min((profile.level.current / profile.level.needed) * 100, 100))
      : 0;

  return (
    <View style={{ gap: 22 }}>
      <Text variant="micro" style={{ color: colors.textMuted }}>
        {`// ${profileEyebrow(profile.isPrivate)} · `}
        <Text variant="micro" style={{ color: theme.accent }}>
          {`@${profile.username}`}
        </Text>
      </Text>

      {/* Identity */}
      <Card accent={theme.accent} style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Avatar avatarUrl={profile.avatar} displayName={profile.displayName} size={88} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="micro" style={{ color: colors.textMuted }}>
              {joinedLabel(profile.joinedAt)}
            </Text>
            <Text variant="display" style={{ fontSize: 26 }} numberOfLines={2}>
              {profile.displayName}
              <Text variant="display" style={{ fontSize: 26, color: theme.accent }}>
                .
              </Text>
            </Text>
            <Text variant="mono" style={{ fontSize: 12, color: colors.textSecondary }}>
              {`@${profile.username}`}
            </Text>
          </View>
        </View>
        {profile.bio ? (
          <Text variant="body" style={{ color: colors.textSecondary }}>
            {profile.bio}
          </Text>
        ) : null}
        {/* Absent on the reader's own page: a button that cannot work is worse
            than no button. */}
        {profile.isSelf ? null : (
          <FriendButton targetId={profile.id} initial={profile.friendship} />
        )}
      </Card>

      {/* Level */}
      <Card style={{ gap: 8 }}>
        <Text variant="micro" style={{ color: theme.accent }}>
          {"> Niveau actuel"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <Text
            style={{ fontFamily: `${fonts.sans}_800ExtraBold`, fontSize: 40, color: theme.accent }}
          >
            {profile.level.level}
          </Text>
          <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
            {`→ LVL ${String(profile.level.level + 1)}`}
          </Text>
        </View>
        <XPBar current={profile.level.current} needed={profile.level.needed} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
            <Text style={{ color: colors.textPrimary }}>{fr(profile.level.current)}</Text>
            {` / ${fr(profile.level.needed)} XP`}
          </Text>
          <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
            {`${String(percent)}%`}
          </Text>
        </View>
      </Card>

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <StatCell value={`+${fr(profile.xpTotal)}`} label="XP total" accent={theme.accent} />
        <StatCell value={`${String(profile.streakDays)}j`} label="Streak actuel" />
        <StatCell value={profile.badges.length} label="Badges" />
      </View>

      {profile.badges.length > 0 ? (
        <View>
          <SectionLabel
            eyebrow={`01 · trophées · ${String(profile.badges.length)}`}
            title="Badges obtenus."
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {profile.badges.map((badge) => {
              const color = RARITY_COLOR[profileRarity(badge.rarity)];
              return (
                <View
                  key={badge.id}
                  accessible
                  accessibilityLabel={badge.name}
                  style={{
                    width: "30%",
                    flexGrow: 1,
                    alignItems: "center",
                    gap: 6,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: colors.borderSubtle,
                  }}
                >
                  <BadgeIcon iconUrl={badge.iconUrl} color={color} size={44} />
                  <Text variant="micro" numberOfLines={2} style={{ textAlign: "center", color }}>
                    {badge.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {profile.recentLessons.length > 0 ? (
        <View>
          <SectionLabel eyebrow="02 · activité" title="Leçons terminées récemment." />
          <Card style={{ padding: 0 }}>
            {profile.recentLessons.map((lesson, i) => {
              const category = profileCategory(lesson.category);
              return (
                <View key={`${lesson.slug}-${String(i)}`}>
                  {i > 0 ? <Divider /> : null}
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}
                  >
                    <Text variant="mono" style={{ fontSize: 11, color: colors.textDisabled }}>
                      {String(i + 1).padStart(2, "0")}
                    </Text>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        variant="micro"
                        style={{ color: category ? CATEGORY_COLOR[category] : colors.textMuted }}
                      >
                        {category ? CATEGORY_LABEL[category] : "-"}
                      </Text>
                      <Text variant="h3" numberOfLines={2}>
                        {lesson.title}
                      </Text>
                    </View>
                    <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                      {shortDay(lesson.completedAt)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The friend button, as on the site (AddFriendButton): the label and the
 * move come from the same module, and the state afterwards is what the server
 * answered, not a guess: asking somebody who already asked lands on friends.
 */
function FriendButton({
  targetId,
  initial,
}: {
  targetId: string;
  initial: FriendshipView;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [state, setState] = useState<FriendshipView>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setState(initial), [initial]);
  const move = friendshipMove(state);

  const press = async (): Promise<void> => {
    setPending(true);
    setError(null);
    const reply =
      move === "request" ? await requestFriendApi(targetId) : await removeFriendApi(targetId);
    setPending(false);
    if (reply.ok) {
      setState(friendshipAfter(move, reply.becameFriends === true));
      // The page itself is not read again: ending a friendship closes a private
      // profile, and the page going blank under the button would read as a bug.
      // The next visit reads it fresh.
      await queryClient.invalidateQueries({ queryKey: ["friends"] });
      await queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    } else if (move === "request") {
      setError(reply.error ?? "Impossible pour l'instant.");
    }
  };

  return (
    <View style={{ gap: 6 }}>
      {move === "request" ? (
        <GradientButton
          label={FRIENDSHIP_ACTION_LABEL[state]}
          loading={pending}
          onPress={() => void press()}
        />
      ) : (
        <View style={{ alignSelf: "flex-start" }}>
          <ActionChip
            label={FRIENDSHIP_ACTION_LABEL[state]}
            tone="neutral"
            disabled={pending}
            onPress={() => void press()}
          />
        </View>
      )}
      {error !== null ? (
        <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
