import { computeTier } from "@cyberlearn/lib/gamification/tier";
import { isoWeekKey } from "@cyberlearn/lib/gamification/week";
import { wrappedWindow } from "@cyberlearn/lib/gamification/wrapped-window";
import { nextRankName, rankName } from "@cyberlearn/lib/dashboard/rank-name";
import { planSections, sectionNumber } from "@cyberlearn/lib/dashboard/sections";
import { dashboardStats } from "@cyberlearn/lib/dashboard/stats";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { AnimatedXPBar, PressableScale, Rise } from "@/components/anim";
import { ActionChip, GradientButton, IconButton } from "@/components/buttons";
import { BellIcon, ChevronRight, SearchIcon } from "@/components/icons";
import { LogoMark } from "@/components/logo";
import { BadgeIcon } from "@/components/media";
import { RevisionsCard } from "@/components/revisions-card";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { StreakPanel } from "@/components/streak-panel";
import { useTourAnchor } from "@/components/tour";
import { WeeklyQuests } from "@/components/weekly-quests";
import { Card, Pill, SectionLabel, Text, XPBar } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";
import { CATEGORY_COLOR, CATEGORY_LABEL, DIFFICULTY_LABEL, RARITY_COLOR } from "@/lib/db";
import { firstName, leadAction, pathsTitle, type HomePath, type LeadProgress } from "@/lib/home";
import {
  useDashboard,
  useQuests,
  useRevisions,
  useUnreadCount,
  type DashboardData,
} from "@/lib/queries";
import { splitReviews } from "@/lib/revisions";
import { useSession } from "@/lib/session";

/**
 * The home tab: the site's dashboard, rebuilt around the paths (PR #233). The
 * paths lead; a half-finished lesson and due revisions follow only when there
 * are some; the reader's own record closes. The sections are numbered as on
 * the site, and the numbering closes up behind a section that has nothing to
 * say (@cyberlearn/lib/dashboard/sections).
 */
export default function Accueil(): React.JSX.Element {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data, isLoading, error, refetch } = useDashboard(userId);
  const { data: revisions } = useRevisions(userId);

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

  const dueReviews =
    revisions?.enabled === true ? splitReviews(revisions.items, new Date()).due.length : 0;

  return (
    <Screen onRefresh={() => refetch()}>
      <HomeBody data={data} userId={userId} dueReviews={dueReviews} />
    </Screen>
  );
}

function HomeBody({
  data,
  userId,
  dueReviews,
}: {
  data: DashboardData;
  userId: string | undefined;
  dueReviews: number;
}): React.JSX.Element {
  const router = useRouter();
  const { theme } = useCosmetics();
  const weekKey = useMemo(() => isoWeekKey(new Date()), []);
  const { data: quests } = useQuests(userId, weekKey);
  const { data: unread } = useUnreadCount(userId);
  const xpAnchor = useTourAnchor("home-xp");
  const streakAnchor = useTourAnchor("home-streak");
  const bellAnchor = useTourAnchor("home-bell");

  const { me, level, rank, badges, resume, paths, stats } = data;
  const tier = computeTier(level.level);
  const sections = planSections({ hasResume: resume !== null, dueReviews });
  const xpToNext = Math.max(level.needed - level.current, 0);
  const fr = (value: number): string => value.toLocaleString("fr-FR");
  const wrapped = wrappedWindow(new Date());

  return (
    <View style={{ gap: 24 }}>
      {/* Greeting */}
      <View style={{ gap: 12 }}>
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <LogoMark size={30} />
            <Text variant="micro" style={{ color: theme.accent }}>
              Bon retour
            </Text>
          </View>
          {/* Wrapped, while it is open and only then: an event in the header, as
              the site shows it in its bar, never a permanent entry. */}
          {wrapped.open ? (
            <View style={{ marginRight: 8 }}>
              <ActionChip
                label={`Wrapped ${wrapped.periodKey}`}
                onPress={() => router.push("/wrapped")}
              />
            </View>
          ) : null}
          {/* The site's navbar search: parcours, lessons and the reader's notes. */}
          <View style={{ marginRight: 8 }}>
            <IconButton onPress={() => router.push("/search")} accessibilityLabel="Rechercher">
              <SearchIcon color={colors.textSecondary} size={20} />
            </IconButton>
          </View>
          <View ref={bellAnchor} collapsable={false}>
            <IconButton
              onPress={() => router.push("/notifications")}
              accessibilityLabel={`Notifications${unread ? `, ${String(unread)} non lues` : ""}`}
              badge={
                (unread ?? 0) > 0 ? (
                  <View
                    style={{
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: colors.danger,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 3,
                    }}
                  >
                    <Text
                      style={{ fontFamily: `${fonts.mono}_700Bold`, fontSize: 9, color: "#fff" }}
                    >
                      {unread}
                    </Text>
                  </View>
                ) : undefined
              }
            >
              <BellIcon color={colors.textSecondary} size={20} />
            </IconButton>
          </View>
        </View>
        <Text variant="display" style={{ fontSize: 30 }}>
          Bonjour, <Text style={{ color: theme.accent }}>{firstName(me.displayName)}.</Text>
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Text variant="body">Tu reprends là où tu t&apos;es arrêté.</Text>
          <View
            ref={streakAnchor}
            collapsable={false}
            accessibilityLabel={`Série de ${String(me.streakDays)} jours`}
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: "rgba(255,181,71,0.4)",
              backgroundColor: "rgba(255,181,71,0.08)",
            }}
          >
            <Text style={{ fontSize: 13 }}>🔥</Text>
            <Text
              style={{
                fontFamily: `${fonts.sans}_800ExtraBold`,
                fontSize: 16,
                color: colors.warning,
              }}
            >
              {me.streakDays}
            </Text>
            <Text variant="micro">{me.streakDays > 1 ? "jours" : "jour"}</Text>
          </View>
        </View>
      </View>

      {/* Level + XP: the rank reached, the level, how far into it, what is left */}
      <View ref={xpAnchor} collapsable={false}>
        <Card style={{ gap: 10, borderTopWidth: 2, borderTopColor: theme.accent }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text variant="micro">Progression</Text>
            <Text variant="micro" style={{ color: tier.tier.color }}>
              Rang #{fr(rank)} · {tier.tier.label}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
            <Text
              style={{
                fontFamily: `${fonts.sans}_800ExtraBold`,
                fontSize: 44,
                lineHeight: 48,
                color: colors.textPrimary,
              }}
            >
              {level.level}
            </Text>
            <View style={{ paddingBottom: 6 }}>
              <Text variant="micro">Niveau</Text>
              <Text variant="h3" style={{ color: theme.accent }}>
                {rankName(level.level)}
              </Text>
            </View>
          </View>
          <AnimatedXPBar current={level.current} needed={level.needed} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
              <Text style={{ color: colors.textPrimary }}>{fr(level.current)}</Text> /{" "}
              {fr(level.needed)} XP
            </Text>
            <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted, flexShrink: 1 }}>
              Encore <Text style={{ color: colors.textPrimary }}>{fr(xpToNext)} XP</Text> pour{" "}
              {nextRankName(level.level)}
            </Text>
          </View>
        </Card>
      </View>

      {/* 01 · Parcours: the lead */}
      <Rise index={1}>
        <SectionLabel
          eyebrow={`${sectionNumber(sections, "paths") ?? "01"} · parcours`}
          title={pathsTitle(paths.leadProgress)}
          right={
            <ActionChip
              label="Tous"
              tone="neutral"
              onPress={() => {
                router.push("/paths");
              }}
            />
          }
        />
        {paths.lead ? (
          <View style={{ gap: 10 }}>
            <LeadPathCard path={paths.lead} progress={paths.leadProgress} />
            {paths.other ? <OtherPathCard path={paths.other} /> : null}
          </View>
        ) : (
          <EmptyState
            title="Tous tes parcours sont terminés"
            body="Bravo. Le catalogue s'enrichit régulièrement : repasse voir les nouveaux."
            actionLabel="Voir les parcours"
            onAction={() => {
              router.push("/paths");
            }}
          />
        )}
      </Rise>

      {/* 02 · En cours: the half-finished lesson, when there is one */}
      {resume ? (
        <Rise index={2}>
          <SectionLabel
            eyebrow={`${sectionNumber(sections, "resume") ?? "02"} · en cours`}
            title="Reprends l'exploit."
            right={
              data.inProgressTotal > 1 ? (
                <Text variant="micro">{data.inProgressTotal} en cours</Text>
              ) : undefined
            }
          />
          <PressableScale
            onPress={() =>
              router.push({ pathname: "/lessons/[slug]", params: { slug: resume.slug } })
            }
          >
            <Card
              accent={theme.accent}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text variant="micro" style={{ color: theme.accent }}>
                  {CATEGORY_LABEL[resume.category]}
                </Text>
                <Text variant="h3" numberOfLines={1}>
                  {resume.title}
                </Text>
              </View>
              <ChevronRight color={theme.accent} size={18} />
            </Card>
          </PressableScale>
        </Rise>
      ) : null}

      {/* 03 · À réviser: only when something is actually due */}
      {dueReviews > 0 ? (
        <Rise index={3}>
          <SectionLabel
            eyebrow={`${sectionNumber(sections, "reviews") ?? "03"} · à réviser`}
            title={`${String(dueReviews)} leçon${dueReviews > 1 ? "s" : ""} demande${dueReviews > 1 ? "nt" : ""} ton attention.`}
          />
          <RevisionsCard userId={userId} />
        </Rise>
      ) : null}

      {/* 04 · Progression: the reader's own record */}
      <Rise index={4}>
        <SectionLabel
          eyebrow={`${sectionNumber(sections, "progress") ?? "04"} · progression`}
          title="Où tu en es."
        />
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {dashboardStats(stats).map((stat) => (
              <View
                key={stat.label}
                style={{
                  flexBasis: "48%",
                  flexGrow: 1,
                  gap: 4,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: stat.highlight ? theme.accent : colors.borderSubtle,
                  backgroundColor: stat.highlight ? `${theme.accent}0D` : "transparent",
                }}
              >
                <Text variant="micro" style={{ fontSize: 9 }}>
                  {stat.label}
                </Text>
                <Text
                  style={{
                    fontFamily: `${fonts.sans}_800ExtraBold`,
                    fontSize: 26,
                    color: stat.highlight ? theme.accent : colors.textPrimary,
                  }}
                >
                  {stat.value}
                  {stat.unit !== null ? (
                    <Text style={{ fontSize: 14, color: colors.textMuted }}> {stat.unit}</Text>
                  ) : null}
                </Text>
                <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
                  {stat.detail}
                </Text>
              </View>
            ))}
          </View>

          <WeeklyQuests quests={quests ?? []} userId={userId} />
          <StreakPanel userId={userId} />

          <PressableScale onPress={() => router.push("/leaderboard")}>
            <Card
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ gap: 2 }}>
                <Text variant="micro">Classement</Text>
                <Text variant="h2">{fr(rank)}e place</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pill label={`Palier ${tier.tier.label}`} color={tier.tier.color} />
                <ChevronRight color={colors.textMuted} size={15} />
              </View>
            </Card>
          </PressableScale>

          {badges.length > 0 ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="micro">Derniers badges</Text>
                <PressableScale onPress={() => router.push("/profile")}>
                  <Text variant="micro" style={{ color: theme.accent }}>
                    Collection · {stats.badgeTotal}
                  </Text>
                </PressableScale>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {badges.map((b) => (
                  <Card
                    key={b.name}
                    style={{ flex: 1, alignItems: "center", gap: 6, paddingVertical: 14 }}
                  >
                    <BadgeIcon iconUrl={b.iconUrl} color={RARITY_COLOR[b.rarity]} size={38} />
                    <Text variant="micro" numberOfLines={1} style={{ color: colors.textSecondary }}>
                      {b.name}
                    </Text>
                  </Card>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </Rise>
    </View>
  );
}

/** The path that leads: a poster before it starts, a place to go on after. */
function LeadPathCard({
  path,
  progress,
}: {
  path: HomePath;
  progress: LeadProgress | null;
}): React.JSX.Element {
  const router = useRouter();
  const accent = CATEGORY_COLOR[path.category];
  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
      : 0;
  const next = progress?.next ?? null;

  const openPath = (): void => {
    router.push({ pathname: "/paths/[slug]", params: { slug: path.slug } });
  };

  return (
    <Card accent={accent} style={{ gap: 12 }}>
      <PressableScale onPress={openPath} accessibilityLabel={`Parcours ${path.title}`}>
        <View style={{ gap: 6 }}>
          <Text variant="micro" style={{ color: accent }}>
            {CATEGORY_LABEL[path.category]} · {DIFFICULTY_LABEL[path.difficulty]}
          </Text>
          <Text variant="h1">{path.title}</Text>
          <Text variant="bodySm" numberOfLines={3}>
            {path.description}
          </Text>
          <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
            {path.lessons.length} missions · ~{path.estimatedHours} h
          </Text>
        </View>
      </PressableScale>

      {progress ? (
        <View style={{ gap: 6 }}>
          <XPBar current={progress.completed} needed={Math.max(progress.total, 1)} height={5} />
          <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
            {percent}% du parcours
            {next ? (
              <>
                {" · Prochaine étape · "}
                <Text style={{ color: colors.textPrimary }}>{next.title}</Text> ·{" "}
                {next.estimatedMinutes} min
              </>
            ) : null}
          </Text>
        </View>
      ) : null}

      <GradientButton
        label={leadAction(progress)}
        onPress={() => {
          if (next) router.push({ pathname: "/lessons/[slug]", params: { slug: next.slug } });
          else openPath();
        }}
      />
    </Card>
  );
}

/** The second suggestion: an offer, not a task, so it stays small. */
function OtherPathCard({ path }: { path: HomePath }): React.JSX.Element {
  const router = useRouter();
  return (
    <PressableScale
      onPress={() => {
        router.push({ pathname: "/paths/[slug]", params: { slug: path.slug } });
      }}
    >
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="micro" style={{ color: CATEGORY_COLOR[path.category] }}>
            Autre piste · {CATEGORY_LABEL[path.category]}
          </Text>
          <Text variant="h3" numberOfLines={2}>
            {path.title}
          </Text>
          <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
            {path.lessons.length} missions · ~{path.estimatedHours} h
          </Text>
        </View>
        <ChevronRight color={colors.textMuted} size={15} />
      </Card>
    </PressableScale>
  );
}
