import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import { Alert, Share, View } from "react-native";
import {
  canChallenge,
  FRIENDS_LABEL,
  FRIENDSHIP_ACTION_LABEL,
  friendshipActionAsksFirst,
  friendshipActions,
  friendshipAfter,
  friendshipMove,
  type FriendshipAction,
} from "@cyberlearn/lib/social/friendship";
import { colors, fonts } from "@cyberlearn/tokens";
import { duelRecordLines, headToHeadVerdict } from "@cyberlearn/lib/social/duel";
import {
  contributionLines,
  holdersLabel,
  lessonsFinishedLabel,
  missionsLabel,
  moreLabel,
  publicProfileUrl,
  sectionNumbers,
  TIMELINE_LABEL,
} from "@cyberlearn/lib/social/portfolio";
import { ActivityCalendar } from "@/components/activity-calendar";
import { ActionChip, BackButton, GradientButton } from "@/components/buttons";
import { Avatar, BadgeIcon } from "@/components/media";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Divider, SectionLabel, StatCell, Text, XPBar } from "@/components/ui";
import { fetchProfileApi, removeFriendApi, requestFriendApi, SITE_URL } from "@/lib/api";
import { CosmeticsScope, useCosmetics } from "@/lib/cosmetics";
import { CATEGORY_COLOR, CATEGORY_LABEL, RARITY_COLOR } from "@/lib/db";
import {
  joinedLabel,
  longDay,
  profileCategory,
  profileCounts,
  profileEyebrow,
  profileRarity,
  shortDay,
  unfriendAlert,
  type FriendshipView,
  type PublicProfile,
} from "@/lib/friends";

/**
 * Somebody's profile page: the site's /u/[username]. Who gets in is the
 * server's rule (anybody on a public profile, only friends on a closed one),
 * and a closed profile reads exactly like a handle that does not exist. What
 * a visitor can do here is the friendship, as on the site; the owner gets the
 * way to change it and the link to hand out.
 *
 * The site's sections, from the same server reads (profileExtras): the
 * figures counted, a year of activity, the head-to-head for a friend, the
 * rarest badges, the paths with their progress, the duels and contributions,
 * the timeline. Drawn in the owner's cosmetics, as the site draws it.
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
      ) : data.ownerCosmetics ? (
        // The owner's look, as the site wears it in its own scope; a server
        // from before it sends none, and the page keeps the reader's.
        <CosmeticsScope loadout={data.ownerCosmetics}>
          <ProfileBody profile={data} />
        </CosmeticsScope>
      ) : (
        <ProfileBody profile={data} />
      )}
    </Screen>
  );
}

function ProfileBody({ profile }: { profile: PublicProfile }): React.JSX.Element {
  const router = useRouter();
  const { theme } = useCosmetics();
  const fr = (value: number): string => value.toLocaleString("fr-FR");
  const percent =
    profile.level.needed > 0
      ? Math.round(Math.min((profile.level.current / profile.level.needed) * 100, 100))
      : 0;
  const counts = profileCounts(profile);
  const name = profile.displayName || profile.username;
  const contributions = profile.contributions ? contributionLines(profile.contributions) : [];
  const duelsPlayed = profile.duelRecord
    ? profile.duelRecord.win + profile.duelRecord.loss + profile.duelRecord.draw
    : 0;
  const moreBadges = moreLabel(profile.badges.length, counts.badges);
  const moreChallenges = moreLabel(profile.challenges.length, counts.challenges);
  // The site's sections, numbered alike, those with nothing to show left out.
  const no = sectionNumbers([
    profile.activity !== undefined && "activity",
    profile.headToHead != null && "faceToFace",
    profile.badges.length > 0 && "badges",
    (profile.paths?.length ?? 0) > 0 && "paths",
    profile.skills.length > 0 && "skills",
    profile.certificates.length > 0 && "certificates",
    profile.challenges.length > 0 && "challenges",
    (duelsPlayed > 0 || contributions.length > 0) && "community",
    (profile.timeline?.length ?? 0) > 0 && "timeline",
    profile.recentLessons.length > 0 && "lessons",
  ]);

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
        {/* The reader's own page: the way to change it and the link to hand
            out. Somebody else's: the friendship with them. No friend button
            on your own page - a button that cannot work is worse than none. */}
        {profile.isSelf ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <ActionChip
              label="Modifier mon profil"
              tone="neutral"
              onPress={() => {
                router.push("/profile-edit");
              }}
            />
            <ActionChip
              label="Partager le lien"
              onPress={() => {
                void Share.share({ message: publicProfileUrl(SITE_URL, profile.username) });
              }}
            />
          </View>
        ) : (
          <FriendActions
            targetId={profile.id}
            name={profile.displayName || profile.username}
            initial={profile.friendship}
          />
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

      {/* Stats: counted on the server, not read off the lists below */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <StatCell value={`+${fr(profile.xpTotal)}`} label="XP total" accent={theme.accent} />
          <StatCell value={`${String(profile.streakDays)}j`} label="Série en cours" />
          <StatCell value={fr(counts.badges)} label="Badges" />
        </View>
        {profile.counts ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StatCell value={fr(counts.lessons)} label="Leçons terminées" />
            <StatCell value={fr(counts.challenges)} label="Défis résolus" />
          </View>
        ) : null}
      </View>

      {profile.activity ? (
        <View>
          <SectionLabel
            eyebrow={`${no("activity")} · activité`}
            title="Une année d'apprentissage."
          />
          <Card style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
              <Text variant="bodySm">
                <Text
                  style={{ fontFamily: `${fonts.sans}_800ExtraBold`, color: colors.textPrimary }}
                >
                  {profile.activity.daysThisYear}
                </Text>
                {profile.activity.daysThisYear > 1 ? " jours actifs" : " jour actif"} cette année
              </Text>
              {profile.activity.longestStreak > 0 ? (
                <Text variant="bodySm">
                  {"record de série : "}
                  <Text
                    style={{ fontFamily: `${fonts.sans}_800ExtraBold`, color: colors.textPrimary }}
                  >
                    {profile.activity.longestStreak}
                  </Text>
                  {profile.activity.longestStreak > 1 ? " jours" : " jour"}
                </Text>
              ) : null}
            </View>
            <ActivityCalendar
              activity={profile.activity.days}
              daysThisYear={profile.activity.daysThisYear}
              label={`Activité de ${name}`}
            />
          </Card>
        </View>
      ) : null}

      {profile.headToHead ? (
        <View>
          <SectionLabel eyebrow={`${no("faceToFace")} · duels entre vous`} title="Face à face." />
          <Card accent={theme.accent} style={{ gap: 12 }}>
            <View
              accessible
              accessibilityLabel={`Toi ${String(profile.headToHead.win)}, ${name} ${String(profile.headToHead.loss)}`}
              style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}
            >
              <Text variant="micro">Toi</Text>
              <Text
                style={{
                  fontFamily: `${fonts.sans}_800ExtraBold`,
                  fontSize: 34,
                  color: theme.accent,
                }}
              >
                {profile.headToHead.win}
              </Text>
              <Text variant="mono" style={{ color: colors.textDisabled }}>
                –
              </Text>
              <Text style={{ fontFamily: `${fonts.sans}_800ExtraBold`, fontSize: 34 }}>
                {profile.headToHead.loss}
              </Text>
              <Text variant="micro" numberOfLines={1} style={{ flexShrink: 1 }}>
                {name}
              </Text>
            </View>
            <Text variant="h3">{headToHeadVerdict(profile.headToHead, name)}</Text>
            {profile.headToHead.draw > 0 ? (
              <Text variant="bodySm">
                {`${String(profile.headToHead.draw)} égalité${profile.headToHead.draw > 1 ? "s" : ""}`}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row" }}>
              {profile.headToHead.openDuelId !== null ? (
                <ActionChip
                  label="Voir le duel en cours"
                  tone="neutral"
                  onPress={() => {
                    const id = profile.headToHead?.openDuelId;
                    if (id) router.push({ pathname: "/duels/[id]", params: { id } });
                  }}
                />
              ) : (
                <ActionChip
                  label="Défier"
                  onPress={() => {
                    router.push({ pathname: "/duels", params: { ami: profile.id } });
                  }}
                />
              )}
            </View>
          </Card>
        </View>
      ) : null}

      {profile.badges.length > 0 ? (
        <View>
          <SectionLabel
            eyebrow={`${no("badges")} · trophées · ${String(counts.badges)}`}
            title="Badges obtenus."
          />
          {profile.rarestBadges && profile.rarestBadges.length > 0 ? (
            <View style={{ gap: 8, marginBottom: 12 }}>
              {profile.rarestBadges.map((badge) => {
                const color = RARITY_COLOR[profileRarity(badge.rarity)];
                return (
                  <Card
                    key={badge.id}
                    style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
                  >
                    <BadgeIcon iconUrl={badge.iconUrl} color={color} size={52} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="micro" style={{ color }}>
                        {badge.rarityLabel}
                      </Text>
                      <Text variant="h3" numberOfLines={2}>
                        {badge.name}
                      </Text>
                      <Text variant="bodySm">{holdersLabel(badge.holders)}</Text>
                    </View>
                  </Card>
                );
              })}
            </View>
          ) : null}
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
          {moreBadges !== null ? <MoreLine text={moreBadges} /> : null}
        </View>
      ) : null}

      {profile.paths && profile.paths.length > 0 ? (
        <View>
          <SectionLabel eyebrow={`${no("paths")} · parcours`} title="En cours et terminés." />
          <Card style={{ padding: 0 }}>
            {profile.paths.map((path, i) => {
              const category = profileCategory(path.category);
              return (
                <View key={path.slug}>
                  {i > 0 ? <Divider /> : null}
                  <View style={{ padding: 12, gap: 8 }}>
                    <Text
                      variant="micro"
                      style={{ color: category ? CATEGORY_COLOR[category] : colors.textMuted }}
                    >
                      {`${category ? CATEGORY_LABEL[category] : "-"} · ${
                        path.completed && path.completedAt !== null
                          ? `terminé le ${longDay(path.completedAt)}`
                          : "en cours"
                      }`}
                    </Text>
                    <Text variant="h3" numberOfLines={2}>
                      {path.title}
                    </Text>
                    <View
                      accessible
                      accessibilityRole="progressbar"
                      accessibilityLabel={`${path.title} : ${String(path.percent)} %`}
                      accessibilityValue={{ min: 0, max: 100, now: path.percent }}
                      style={{
                        height: 6,
                        borderWidth: 1,
                        borderColor: colors.borderDefault,
                        backgroundColor: "rgba(5,4,26,0.9)",
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          height: "100%",
                          width: `${path.percent}%`,
                          backgroundColor: theme.accent,
                        }}
                      />
                    </View>
                    <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                      {path.completed
                        ? "100 %"
                        : `${String(path.percent)} % · ${missionsLabel(path.done, path.total)}`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      ) : null}

      {profile.skills.length > 0 ? (
        <View>
          <SectionLabel eyebrow={`${no("skills")} · compétences`} title="Ce qui est acquis." />
          <View style={{ gap: 8 }}>
            {profile.skills.map((skill) => (
              <Card key={skill.category} style={{ gap: 4 }}>
                <Text variant="micro" style={{ color: skill.color }}>
                  {skill.label}
                </Text>
                <Text variant="h3">{lessonsFinishedLabel(skill.lessons)}</Text>
                {skill.paths.map((title) => (
                  <Text key={title} variant="bodySm">
                    Parcours terminé : {title}
                  </Text>
                ))}
              </Card>
            ))}
          </View>
        </View>
      ) : null}

      {profile.certificates.length > 0 ? (
        <View>
          <SectionLabel
            eyebrow={`${no("certificates")} · certificats · ${String(counts.certificates)}`}
            title="Attestations obtenues."
          />
          <Card style={{ padding: 0 }}>
            {profile.certificates.map((cert, i) => (
              <View key={cert.publicId}>
                {i > 0 ? <Divider /> : null}
                <View style={{ padding: 12, gap: 8 }}>
                  <Text variant="micro" style={{ color: colors.textMuted }}>
                    {monthYear(cert.issuedAt)}
                    {cert.score !== null ? ` · ${String(cert.score)} %` : ""}
                  </Text>
                  <Text variant="h3">{cert.pathTitle}</Text>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <ActionChip
                      label="Vérifier"
                      tone="neutral"
                      onPress={() => void WebBrowser.openBrowserAsync(cert.verifyUrl)}
                    />
                    {cert.linkedInUrl !== null ? (
                      <ActionChip
                        label="Ajouter à LinkedIn"
                        onPress={() => void WebBrowser.openBrowserAsync(cert.linkedInUrl ?? "")}
                      />
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {profile.challenges.length > 0 ? (
        <View>
          <SectionLabel
            eyebrow={`${no("challenges")} · défis · ${String(counts.challenges)}`}
            title="Défis résolus."
          />
          <Card style={{ padding: 0 }}>
            {profile.challenges.map((challenge, i) => (
              <View key={challenge.slug}>
                {i > 0 ? <Divider /> : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="micro" style={{ color: challenge.difficultyColor }}>
                      {challenge.difficultyLabel}
                    </Text>
                    <Text variant="h3" numberOfLines={2}>
                      {challenge.title}
                    </Text>
                  </View>
                  <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                    {shortDay(challenge.completedAt)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
          {moreChallenges !== null ? <MoreLine text={moreChallenges} /> : null}
        </View>
      ) : null}

      {duelsPlayed > 0 || contributions.length > 0 ? (
        <View>
          <SectionLabel eyebrow={`${no("community")} · communauté`} title="Avec les autres." />
          <View style={{ gap: 8 }}>
            {profile.duelRecord && duelsPlayed > 0 ? (
              <Card style={{ gap: 10 }}>
                <Text variant="micro">Duels · depuis toujours</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {duelRecordLines(profile.duelRecord).map((line) => (
                    <StatCell
                      key={line.outcome}
                      value={line.n}
                      label={line.word}
                      accent={line.outcome === "win" ? theme.accent : colors.textPrimary}
                    />
                  ))}
                </View>
              </Card>
            ) : null}
            {contributions.length > 0 ? (
              <Card style={{ gap: 10 }}>
                <Text variant="micro">Contributions</Text>
                {contributions.map((line) => (
                  <View
                    key={line.key}
                    style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
                  >
                    <Text style={{ fontFamily: `${fonts.sans}_800ExtraBold`, fontSize: 22 }}>
                      {line.n}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text variant="body">{line.label}</Text>
                      {line.detail !== null ? <Text variant="bodySm">{line.detail}</Text> : null}
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}
          </View>
        </View>
      ) : null}

      {profile.timeline && profile.timeline.length > 0 ? (
        <View>
          <SectionLabel eyebrow={`${no("timeline")} · chronologie`} title="Ses derniers moments." />
          <Card style={{ padding: 0 }}>
            {profile.timeline.map((event, i) => (
              <View key={event.key}>
                {i > 0 ? <Divider /> : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      variant="micro"
                      style={{
                        color: event.kind === "badge" ? RARITY_COLOR.LEGENDARY : theme.accent,
                      }}
                    >
                      {TIMELINE_LABEL[event.kind]}
                    </Text>
                    <Text variant="h3" numberOfLines={2}>
                      {event.title}
                    </Text>
                  </View>
                  <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                    {longDay(event.at)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {profile.recentLessons.length > 0 ? (
        <View>
          <SectionLabel
            eyebrow={`${no("lessons")} · leçons · ${String(counts.lessons)}`}
            title="Leçons terminées récemment."
          />
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
 * The friendship, as on the site (FriendshipActions): the buttons, their
 * labels and their moves come from the same module, and the state afterwards
 * is what the server answered, not a guess: asking somebody who already asked
 * lands on friends. A request received is accepted or refused. Between
 * friends the card says "Ami ✓", and pressing it offers to end the
 * friendship, which asks first. The duel follows the state, so it appears on
 * accepting and goes on removing, as the site's does. A refusal is said,
 * whatever the move.
 */
function FriendActions({
  targetId,
  name,
  initial,
}: {
  targetId: string;
  name: string;
  initial: FriendshipView;
}): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, setState] = useState<FriendshipView>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setState(initial), [initial]);

  const press = async (action: FriendshipAction): Promise<void> => {
    const move = friendshipMove(action);
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
    } else {
      setError(reply.error ?? "Impossible pour l'instant.");
    }
  };

  const onPress = (action: FriendshipAction): void => {
    if (!friendshipActionAsksFirst(action)) {
      void press(action);
      return;
    }
    const alert = unfriendAlert(name, () => void press(action));
    Alert.alert(alert.title, alert.message, alert.buttons);
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        {state === "friends" ? (
          // The state, with its one way out behind it: the dialog that asks
          // before a friendship ends.
          <ActionChip
            label={FRIENDS_LABEL}
            disabled={pending}
            onPress={() => {
              onPress("unfriend");
            }}
          />
        ) : (
          friendshipActions(state).map((action) =>
            action === "request" || action === "accept" ? (
              <GradientButton
                key={action}
                label={FRIENDSHIP_ACTION_LABEL[action]}
                loading={pending}
                onPress={() => {
                  onPress(action);
                }}
              />
            ) : (
              <ActionChip
                key={action}
                label={FRIENDSHIP_ACTION_LABEL[action]}
                tone="neutral"
                disabled={pending}
                onPress={() => {
                  onPress(action);
                }}
              />
            ),
          )
        )}
        {canChallenge(state) ? (
          <ActionChip
            label="Défier en duel"
            onPress={() => {
              router.push({ pathname: "/duels", params: { ami: targetId } });
            }}
          />
        ) : null}
      </View>
      {error !== null ? (
        <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** "et 4 autres", under a list that stops before its count. */
function MoreLine({ text }: { text: string }): React.JSX.Element {
  return (
    <Text variant="micro" style={{ marginTop: 10 }}>
      {text}
    </Text>
  );
}

/** "mars 2026", for a certificate's date. */
function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
